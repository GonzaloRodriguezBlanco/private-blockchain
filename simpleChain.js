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
        this.startEventLog();
        this.checkAndCreateGenesisBlock();
    }

    // Add new block
    addBlock(newBlock) {
        // DONE (3): Check if a Genesis Block already exists. If not, one is created before adding the block
        this.checkAndCreateGenesisBlock()
            .then((genesisBlock) => {
                return this.getBlockHeight()
            })
            .then((prevBlockHeight) => {
                newBlock.height = prevBlockHeight + 1;
                newBlock.time = new Date().getTime().toString().slice(0, -3);
                return this.getBlock(prevBlockHeight);
            })
            .then((previousRawBlock) => {
                let previousBlock = JSON.parse(previousRawBlock.value);
                newBlock.previousBlockHash = previousBlock.hash;
                newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                // DONE (2): Add a method to store newBlock with LevelDB
                // Adding block object to chain
                this.storeBlock(newBlock.height, newBlock);
            })
            .catch((err) => {
                console.log("Error", err);
            });
    }

    checkAndCreateGenesisBlock() {
        return this.getBlock(0)
            .catch((err) => {
                if (err.notFound) {
                    // DONE (4): Genesis block persist as the first block in the blockchain using LevelDB
                    let genesisBlock = new Block("Genesis block");
                    genesisBlock.time = new Date().getTime().toString().slice(0, -3);
                    genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
                    return this.storeBlock(0, genesisBlock);
                }

            })
    }

    async storeBlock(height, block) {
        return await this.chain.put(height, JSON.stringify(block));
    }

    // Get block height
    getBlockHeight() {
        // DONE (9): Modify getBlockHeight() function to retrieve current block height within the LevelDB chain
        let options = {
            reverse: true,
            keys: true,
            values: false,
            limit: 1
        }

        return new Promise((resolve, reject) => {
            let lastHeight;
            this.chain.createReadStream(options)
                .on('data', function (data) {
                    lastHeight = data;
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
        return this.chain.get(blockHeight)
            .then((block) => {
                return { key: blockHeight, value: block };
            });
    }

    // validate block
    validateBlock(blockHeight) {
        // DONE (6): Modify the validateBlock() function to validate a block stored within LevelDB
        return new Promise((resolve, reject) => {
            this.getBlock(blockHeight)
                .then((rawBlock) => {
                    let block = JSON.parse(rawBlock.value);
                    let blockHash = block.hash;
                    // remove block hash to test block integrity
                    block.hash = '';
                    // generate block hash
                    let validBlockHash = SHA256(JSON.stringify(block)).toString();
                    // Compare
                    if (blockHash === validBlockHash) {
                        console.log('Block # ' + blockHeight + ' valid');
                        block.hash = validBlockHash;
                        resolve({height: blockHeight, chainBlock: block});
                    } else {
                        console.log('Block #' + blockHeight + ' invalid hash:\n' + blockHash + ' <> ' + validBlockHash);
                        reject({height: blockHeight, chainBlock: block});
                    }
                });
        });

    }

    // Validate blockchain
    validateChain() {
        let errorLog = [];
        let blockCount = 0;
        // DONE (7): Modify the validateChain() function to validate blockchain stored within LevelDB
        this.chain.createReadStream()
            .on('data', async (block) => {
                blockCount ++;

                let height = block.key;
                let validateBlock = await this.validateBlock(height)
                    .catch((invalidBlock) => {
                        errorLog.push(invalidBlock.height);
                    })
                    .then((validBlock) => {
                        return this.getBlock(height - 1);
                    })
                    .then((previousBlock) => {
                        let previousBlockHash = JSON.parse(block.value).previousBlockHash;
                        let hash = JSON.parse(previousBlock.value).hash;
                        if(hash !== previousBlockHash) {
                            console.log("Block  #" + height + ' invalid link:\n' + previousBlockHash + ' <> ' + hash);
                            errorLog.push(height);
                        }
                    })
                    .catch((err) => {
                        console.log("No previous block");
                    });

                if (blockCount === parseInt(height) + 1) {
                    if(errorLog.length > 0) {
                        console.log('Block errors = ' + errorLog.length);
                        console.log('Blocks: ', errorLog);
                    } else {
                        console.log('No errors detected');
                    }
                }

            });

    }

    generateInvalidBlock(blockHeight) {
        this.getBlock(blockHeight).then((block) => {            // get block
            block = JSON.parse(block.value);                    // parse as JSON
            block.body = "error"                                // modify body
            this.chain.put(blockHeight, JSON.stringify(block))  // reinsert in the same position
        })
    }

    generateInvalidHashLink(validBlockHeight, reinsertionPosition) {
        this.getBlock(validBlockHeight).then((block) => {               // get a block (must be a valid block and not a modified one)
            block = JSON.parse(block.value);
            this.chain.put(reinsertionPosition, JSON.stringify(block))  // reinsert in another position. This will pass validateBlock() but not the hash link check
        })
    }

    printChain() {
        console.log('Print chain:')
        let separator = '------------------------------------------------------------------------------------------------------------------------------------------------------------------------------';
        this.chain.createReadStream()
            .on('data', (data) => {
                JSON.stringify(data.value).toString().length
                console.log(separator);
                console.log('Block # ', data.key);
                console.log(data.value);
            })
            .on('error', (err) => console.log(err))
            .on('close', () => console.log(separator))
    }

    startEventLog() {
        this.chain
            .on('put', (key, value) => {
                console.log("Key has been updated ", key, value);
                this.printChain();
            })
            .on('del', (key) => {
                console.log("Key has been dleted ", key);
                this.printChain();
            })
            .on('batch', (operations) => {
                console.log("Batch has executed ", operations);
                this.printChain();
            })
            .on('opening', () => console.log("Underlying store is opening"))
            .on('open', () => console.log("Store has opened"))
            .on('closing', () => console.log("Store is closing"))
            .on('closed', () => console.log("Store has closed"));
    }
}
