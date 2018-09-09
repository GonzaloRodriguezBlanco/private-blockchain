/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');


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
        // TODO (1): Configure simpleChain.js with LevelDB to persist blockchain dataset using the level Node.js library.
        this.chain = [];
        // TODO (5): Delete this due to the check of Genesis Block existence and creation in addBlock
        this.addBlock(new Block("First block in the chain - Genesis block"));
    }

    // Add new block
    addBlock(newBlock) {
        // TODO (3): Check if a Genesis Block already exists. If not, one is created before adding the block
        // TODO (4): Genesis block persist as the first block in the blockchain using LevelDB
        // Block height
        newBlock.height = this.chain.length;
        // UTC timestamp
        newBlock.time = new Date().getTime().toString().slice(0, -3);
        // previous block hash
        if (this.chain.length > 0) {
            newBlock.previousBlockHash = this.chain[this.chain.length - 1].hash;
        }
        // Block hash with SHA256 using newBlock and converting to a string
        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
        // TODO (2): Add a method to store newBlock with LevelDB
        // Adding block object to chain
        this.chain.push(newBlock);
    }

    // Get block height
    getBlockHeight() {
        // TODO (9): Modify getBlockHeight() function to retrieve current block height within the LevelDB chain
        return this.chain.length - 1;
    }

    // get block
    getBlock(blockHeight) {
        // TODO (8): Modify getBlock() function to retrieve a block by it's block height within the LevelDB chain
        // return object as a single string
        return JSON.parse(JSON.stringify(this.chain[blockHeight]));
    }

    // validate block
    validateBlock(blockHeight) {
        // TODO (6): Modify the validateBlock() function to validate a block stored within LevelDB
        // get block object
        let block = this.getBlock(blockHeight);
        // get block hash
        let blockHash = block.hash;
        // remove block hash to test block integrity
        block.hash = '';
        // generate block hash
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        // Compare
        if (blockHash === validBlockHash) {
            return true;
        } else {
            console.log('Block #' + blockHeight + ' invalid hash:\n' + blockHash + '<>' + validBlockHash);
            return false;
        }
    }

    // Validate blockchain
    validateChain() {
        // TODO (7): Modify the validateChain() function to validate blockchain stored within LevelDB
        let errorLog = [];
        for (var i = 0; i < this.chain.length - 1; i++) {
            // validate block
            if (!this.validateBlock(i)) errorLog.push(i);
            // compare blocks hash link
            let blockHash = this.chain[i].hash;
            let previousHash = this.chain[i + 1].previousBlockHash;
            if (blockHash !== previousHash) {
                errorLog.push(i);
            }
        }
        if (errorLog.length > 0) {
            console.log('Block errors = ' + errorLog.length);
            console.log('Blocks: ' + errorLog);
        } else {
            console.log('No errors detected');
        }
    }
}
