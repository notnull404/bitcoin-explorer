import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

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

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'blockchain_monitor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 获取当前区块信息
router.get('/current-block', async (req, res) => {
  try {
    // 添加缓存控制头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const [rows] = await pool.query<BlockInfo[]>(`
      SELECT * FROM block_info 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    console.log('Sending block info:', rows[0]);
    res.json(rows[0] || null);
  } catch (error) {
    console.error('Error fetching current block:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取市场数据
router.get('/market-data', async (req, res) => {
  try {
    // 添加缓存控制头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const [rows] = await pool.query<MarketData[]>(`
      SELECT * FROM market_data 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    console.log('Sending market data:', rows[0]);
    res.json(rows[0] || null);
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取最近交易
router.get('/recent-transactions', async (req, res) => {
  try {
    const [rows] = await pool.query<Transaction[]>(`
      SELECT * FROM recent_transactions 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取历史数据（用于图表）
router.get('/historical-data', async (req, res) => {
  try {
    const [blocks] = await pool.query<BlockInfo[]>(`
      SELECT * FROM block_info 
      ORDER BY timestamp DESC 
      LIMIT 100
    `);

    const [prices] = await pool.query<MarketData[]>(`
      SELECT * FROM market_data 
      ORDER BY timestamp DESC 
      LIMIT 100
    `);

    const blocksList = Array.isArray(blocks) ? blocks : [];
    const pricesList = Array.isArray(prices) ? prices : [];

    res.json({
      blocks: blocksList.reverse(),
      prices: pricesList.reverse()
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 