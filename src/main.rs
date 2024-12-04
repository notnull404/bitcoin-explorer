use mysql::prelude::*;
use mysql::{Pool, PooledConn};
use reqwest;
use serde::Deserialize;
use std::error::Error;
use std::result::Result;
use tokio::time::Duration;

#[derive(Deserialize, Debug)]
struct BlockInfo {
    height: i64,
    hash: String,
    tx_count: i32,
    average_fee: f64,
    total_volume: f64,
    mempool_size: i32,
}

#[derive(Deserialize, Debug)]
struct MarketData {
    market_price: f64,
    volume_24h: f64,
    market_cap: f64,
}

#[derive(Deserialize, Debug)]
struct Transaction {
    tx_hash: String,
    amount: f64,
    fee: f64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    println!("Starting Bitcoin Explorer...");
    
    // 尝试连接数据库
    println!("Connecting to database...");
    let pool = match Pool::new("mysql://root:root@localhost:3306/blockchain_monitor") {
        Ok(pool) => {
            println!("Database connection successful");
            pool
        },
        Err(e) => {
            println!("Failed to connect to database: {}", e);
            return Err(Box::new(e));
        }
    };

    let mut conn = match pool.get_conn() {
        Ok(conn) => {
            println!("Got database connection");
            conn
        },
        Err(e) => {
            println!("Failed to get database connection: {}", e);
            return Err(Box::new(e));
        }
    };

    println!("Starting main loop...");
    loop {
        match fetch_and_store_data(&mut conn).await {
            Ok(_) => println!("Data update successful"),
            Err(e) => println!("Error updating data: {}", e),
        }
        
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}

async fn fetch_and_store_data(conn: &mut PooledConn) -> Result<(), Box<dyn Error + Send + Sync>> {
    const MAX_RETRIES: u32 = 3;
    let mut retries = 0;

    while retries < MAX_RETRIES {
        println!("Attempt {} of {}", retries + 1, MAX_RETRIES);
        
        match fetch_data_with_validation().await {
            Ok((block_info, market_data, transactions)) => {
                store_data(conn, &block_info, &market_data, &transactions).await?;
                println!("Data successfully stored");
                return Ok(());
            }
            Err(e) => {
                println!("Error on attempt {}: {}", retries + 1, e);
                retries += 1;
                if retries < MAX_RETRIES {
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
    }
    
    Err("Failed to fetch valid data after max retries".into())
}

async fn fetch_data_with_validation() -> Result<(BlockInfo, MarketData, Vec<Transaction>), Box<dyn Error + Send + Sync>> {
    let block_height = fetch_block_height().await?;
    let block_info = fetch_block_info(block_height).await?;
    let market_data = fetch_market_data().await?;
    let transactions = fetch_recent_transactions().await?;
    
    // 验证所有数据
    if block_info.tx_count == 0 || block_info.total_volume == 0.0 {
        return Err("Invalid block data".into());
    }
    
    Ok((block_info, market_data, transactions))
}

async fn fetch_block_height() -> Result<i64, Box<dyn Error + Send + Sync>> {
    let response = reqwest::get("https://blockchain.info/q/getblockcount")
        .await?
        .text()
        .await?;
    Ok(response.trim().parse()?)
}

async fn fetch_block_info(height: i64) -> Result<BlockInfo, Box<dyn Error + Send + Sync>> {
    let url = format!("https://blockchain.info/block-height/{}?format=json", height);
    let response = reqwest::get(&url).await?;
    let block_data: serde_json::Value = response.json().await?;
    
    let block = &block_data["blocks"][0];
    
    // 添加调试输出
    println!("Raw block data: {:?}", block);
    
    // 计算总交易量
    let mut total_volume = 0.0;
    if let Some(txs) = block["tx"].as_array() {
        for tx in txs {
            if let Some(outputs) = tx["out"].as_array() {
                for output in outputs {
                    total_volume += output["value"].as_f64().unwrap_or(0.0);
                }
            }
        }
    }
    total_volume = total_volume / 100000000.0; // 转换为 BTC
    
    // 获取交易数量，确保不为0
    let tx_count = block["n_tx"].as_i64().unwrap_or(0) as i32;
    if tx_count == 0 {
        println!("Warning: Transaction count is 0, retrying...");
        return Err("Invalid transaction count".into());
    }
    
    // 计算平均手续费
    let fee = block["fee"].as_f64().unwrap_or(0.0) / 100000000.0; // 转换为 BTC
    let average_fee = if tx_count > 0 { fee / (tx_count as f64) } else { 0.0 };
    
    // 验证数据有效性
    if total_volume == 0.0 || average_fee == 0.0 {
        println!("Warning: Invalid data detected");
        println!("Total Volume: {}", total_volume);
        println!("Average Fee: {}", average_fee);
        return Err("Invalid data".into());
    }
    
    println!("Processed data:");
    println!("Transaction Count: {}", tx_count);
    println!("Average Fee: {}", average_fee);
    println!("Total Volume: {}", total_volume);
    println!("Mempool Size: {}", block["size"].as_i64().unwrap_or(0));
    
    Ok(BlockInfo {
        height,
        hash: block["hash"].as_str().unwrap_or("").to_string(),
        tx_count,
        average_fee,
        total_volume,
        mempool_size: block["size"].as_i64().unwrap_or(0) as i32,
    })
}

async fn fetch_market_data() -> Result<MarketData, Box<dyn Error + Send + Sync>> {
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true";
    let response = reqwest::get(url).await?;
    let price_data: serde_json::Value = response.json().await?;
    
    // 添加调试输出
    println!("Raw market data: {:?}", price_data);
    
    let market_price = price_data["bitcoin"]["usd"].as_f64().unwrap_or(0.0);
    let volume_24h = price_data["bitcoin"]["usd_24h_vol"].as_f64().unwrap_or(0.0);
    let market_cap = price_data["bitcoin"]["usd_market_cap"].as_f64().unwrap_or(0.0);
    
    println!("Processed market data:");
    println!("Market Price: ${}", market_price);
    println!("24h Volume: ${}", volume_24h);
    println!("Market Cap: ${}", market_cap);
    
    Ok(MarketData {
        market_price,
        volume_24h,
        market_cap,
    })
}

async fn fetch_recent_transactions() -> Result<Vec<Transaction>, Box<dyn Error + Send + Sync>> {
    let url = "https://blockchain.info/unconfirmed-transactions?format=json";
    let response = reqwest::get(url).await?;
    let tx_data: serde_json::Value = response.json().await?;
    
    let mut transactions = Vec::new();
    for tx in tx_data["txs"].as_array().unwrap_or(&Vec::new()).iter().take(10) {
        transactions.push(Transaction {
            tx_hash: tx["hash"].as_str().unwrap_or("").to_string(),
            amount: tx["out"][0]["value"].as_f64().unwrap_or(0.0) / 100000000.0,
            fee: tx["fee"].as_f64().unwrap_or(0.0) / 100000000.0,
        });
    }
    
    Ok(transactions)
}

async fn store_data(
    conn: &mut PooledConn,
    block_info: &BlockInfo,
    market_data: &MarketData,
    transactions: &[Transaction],
) -> Result<(), Box<dyn Error + Send + Sync>> {
    // 存储区块信息
    conn.exec_drop(
        "INSERT INTO block_info (block_height, block_hash, transaction_count, average_fee, total_volume, mempool_size) 
         VALUES (?, ?, ?, ?, ?, ?)",
        (
            &block_info.height,
            &block_info.hash,
            &block_info.tx_count,
            &block_info.average_fee,
            &block_info.total_volume,
            &block_info.mempool_size,
        ),
    )?;

    // 存储市场数据
    conn.exec_drop(
        "INSERT INTO market_data (market_price, volume_24h, market_cap) VALUES (?, ?, ?)",
        (
            &market_data.market_price,
            &market_data.volume_24h,
            &market_data.market_cap,
        ),
    )?;

    // 存储最近交易
    for tx in transactions {
        conn.exec_drop(
            "INSERT INTO recent_transactions (tx_hash, amount, fee) VALUES (?, ?, ?)",
            (
                &tx.tx_hash,
                &tx.amount,
                &tx.fee,
            ),
        )?;
    }

    Ok(())
}