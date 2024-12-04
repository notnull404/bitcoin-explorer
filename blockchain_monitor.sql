-- 删除已存在的数据库
DROP DATABASE IF EXISTS blockchain_monitor;

-- 创建数据库
CREATE DATABASE blockchain_monitor;

-- 切换到数据库
USE blockchain_monitor;

-- 区块信息表 (链上数据)
CREATE TABLE block_info (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    block_height BIGINT NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    transaction_count INT NOT NULL,
    average_fee DECIMAL(20,8) NOT NULL,
    total_volume DECIMAL(30,8) NOT NULL,
    mempool_size INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_height (block_height),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 市场数据表 (链下数据)
CREATE TABLE market_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    market_price DECIMAL(20,2) NOT NULL,
    volume_24h DECIMAL(20,2),
    market_cap DECIMAL(20,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 最近交易表
CREATE TABLE recent_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(64) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    fee DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;