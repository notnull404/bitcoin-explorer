import React from 'react';

interface BlockInfo {
  block_height: number;
  block_hash: string;
  transaction_count: number;
  average_fee: number;
  total_volume: number;
  mempool_size: number;
  timestamp: string;
}

interface MarketData {
  market_price: number;
  volume_24h: number;
  market_cap: number;
  timestamp: string;
}

interface Transaction {
  tx_hash: string;
  amount: number;
  fee: number;
  timestamp: string;
}

const App: React.FC = () => {
  const [blockInfo, setBlockInfo] = React.useState<BlockInfo | null>(null);
  const [marketData, setMarketData] = React.useState<MarketData | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [lastUpdate, setLastUpdate] = React.useState<string>('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [blockResponse, marketResponse, txResponse] = await Promise.all([
          fetch('/api/current-block'),
          fetch('/api/market-data'),
          fetch('/api/recent-transactions'),
        ]);

        const blockData = await blockResponse.json();
        const marketData = await marketResponse.json();
        const txData = await txResponse.json();

        if (blockData) {
          setBlockInfo(prev => {
            if (!prev || blockData.block_height !== prev.block_height) {
              return blockData;
            }
            return prev;
          });
        }

        if (marketData) {
          setMarketData(prev => {
            if (!prev || marketData.market_price !== prev.market_price) {
              return marketData;
            }
            return prev;
          });
        }

        if (txData && txData.length > 0) {
          setTransactions(txData);
        }

        setLastUpdate(new Date().toISOString());
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: any): string => {
    if (value === null || value === undefined) return 'Loading...';
    const num = Number(value);
    if (isNaN(num)) return 'Invalid';
    
    if (num > 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num > 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(8);
  };

  // 数据变化动画类
  const dataChangeClass = "transition-all duration-300 ease-in-out";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Bitcoin Explorer</h1>

        <div className="text-center text-sm text-gray-500 mb-4">
          Last Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Latest Block</h3>
            <p className="text-3xl font-bold text-primary">
              {blockInfo?.block_height?.toLocaleString() || 'Loading...'}
            </p>
          </div>

          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Transaction Count</h3>
            <p className="text-3xl font-bold text-primary">
              {blockInfo?.transaction_count?.toLocaleString() || 'Loading...'}
            </p>
          </div>

          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Average Fee</h3>
            <p className="text-3xl font-bold text-primary">
              {formatNumber(blockInfo?.average_fee)} BTC
            </p>
          </div>

          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Total Volume</h3>
            <p className="text-3xl font-bold text-primary">
              {blockInfo?.total_volume ? `${formatNumber(blockInfo.total_volume)} BTC` : 'Loading...'}
            </p>
          </div>

          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Market Price</h3>
            <p className="text-3xl font-bold text-primary">
              {marketData?.market_price ? 
                `$${marketData.market_price.toLocaleString()}` : 
                'Loading...'}
            </p>
          </div>

          <div className={`stat-card ${dataChangeClass} hover:scale-105`}>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Mempool Size</h3>
            <p className="text-3xl font-bold text-primary">
              {blockInfo?.mempool_size?.toLocaleString() || 'Loading...'} bytes
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Transaction Hash</th>
                  <th className="text-right py-3 px-4">Amount (BTC)</th>
                  <th className="text-right py-3 px-4">Fee (BTC)</th>
                  <th className="text-right py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.tx_hash} className={`border-b hover:bg-gray-50 ${dataChangeClass}`}>
                    <td className="py-3 px-4 font-mono text-sm break-all">
                      {tx.tx_hash}
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatNumber(tx.fee)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 