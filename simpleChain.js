/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const level = require('level');
const chainDB = './chaindata';


/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
    constructor(data) {
        this.hash = "",
            this.height = 0,
            this.body = data,
            this.time = 0,
            this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
    constructor() {
        // DONE (1): Configure simpleChain.js with LevelDB to persist blockchain dataset using the level Node.js library.
        this.chain = level(chainDB);
        // DONE (5): Delete this due to the check of Genesis Block existence and creation in addBlock
        // this.addBlock(new Block("First block in the chain - Genesis block"));
    }

    // Add new block
    addBlock(newBlock) {
        // DONE (3): Check if a Genesis Block already exists. If not, one is created before adding the block
        this.getBlock(0)
            .catch((err) => {
                if (err.notFound) {
                    console.log('There is not a Genesis Block');
                    // DONE (4): Genesis block persist as the first block in the blockchain using LevelDB
                    let genesisBlock = new Block("First block in the chain - Genesis block");
                    genesisBlock.time = new Date().getTime().toString().slice(0, -3);
                    genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
                    return this.storeBlock(genesisBlock);
                }

            })
            .then((value) => {
                return this.getBlockHeight()
            })
            .then((lastBlockHeight) => {
                console.log('Last Block Height', lastBlockHeight);
                let blockHeight = lastBlockHeight + 1;
                newBlock.height = blockHeight;
                newBlock.time = new Date().getTime().toString().slice(0, -3);
                return this.getBlock(lastBlockHeight);
            })
            .then((previousRawBlock) => {
                let previousBlock = JSON.parse(previousRawBlock);
                console.log('Previous Block', previousBlock);
                newBlock.previousBlockHash = previousBlock.hash;
                newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                // DONE (2): Add a method to store newBlock with LevelDB
                // Adding block object to chain
                this.storeBlock(newBlock);
            })
            .catch((err) => {
                console.log("Error", err);
            });
    }

    storeBlock(block) {
        console.log('Store Block', block);
        return this.chain.put(block.height, JSON.stringify(block));
    }

    // Get block height
    getBlockHeight() {
        // DONE (9): Modify getBlockHeight() function to retrieve current block height within the LevelDB chain
        let options = {
            reverse: true,
            limit: 1
        }

        return new Promise((resolve, reject) => {
            let lastHeight;
            this.chain.createReadStream()
                .on('data', function (data) {
                    console.log('Read data from stream', data)
                    lastHeight = data.key;
                })
                .on('error', function (err) {
                    reject(err)
                })
                .on('close', function () {
                    resolve(parseInt(lastHeight));
                });
        });
    }

    // get block
    getBlock(blockHeight) {
        // DONE (8): Modify getBlock() function to retrieve a block by it's block height within the LevelDB chain
        return this.chain.get(blockHeight);
    }

    // validate block
    validateBlock(blockHeight) {
        // DONE (6): Modify the validateBlock() function to validate a block stored within LevelDB
        return new Promise((resolve, reject) => {
            this.getBlock(blockHeight)
                .then((rawBlock) => {
                    let block = JSON.parse(rawBlock);
                    let blockHash = block.hash;
                    // remove block hash to test block integrity
                    block.hash = '';
                    // generate block hash
                    let validBlockHash = SHA256(JSON.stringify(block)).toString();
                    // Compare
                    if (blockHash === validBlockHash) {
                        console.log('Block # ' + blockHeight + ' valid');
                        block.hash = validBlockHash;
                        resolve(block);
                    } else {
                        console.log('Block #' + blockHeight + ' invalid hash:\n' + blockHash + '<>' + validBlockHash);
                        reject(blockHeight);
                    }
                });
        });

    }

    // Validate blockchain
    validateChain() {
        // DONE (7): Modify the validateChain() function to validate blockchain stored within LevelDB
        let errorLog = [];
        let previousBlock;
        let block;
        this.chain.createKeyStream()
            .on('data', (blockHeight) => {
                this.validateBlock(blockHeight)
                    .catch((blockHeight) => {
                        errorLog.push(blockHeight);
                    })
                    .then((block) => {
                        previousBlock = block;
                        return this.getBlock(block.height + 1)
                    })
                    .catch((err) => {
                        if(err.notFound) {
                            console.log('This is the last block');
                        }
                    })
                    .then((rawBlock) => {
                        if (rawBlock != null) {
                            block = JSON.parse(rawBlock);
                            console.log('previous', previousBlock);
                            console.log('block', block);
                            if(previousBlock.hash !== block.previousBlockHash) {
                                errorLog.push(block.height);
                            }
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            })
            .on('error', function (err) {
                console.log(err);
            })
            .on('close', function () {
                if (errorLog.length > 0) {
                    console.log('Block errors = ' + errorLog.length);
                    console.log('Blocks: ' + errorLog);
                } else {
                    console.log('No errors detected');
                }
            });
    }
}
