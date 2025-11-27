const { ethers } = require('ethers');

class MerkleTree {
  constructor(elements) {
    this.elements = [...new Set(elements)];
    this.bufferElementPositionIndex = this.elements.reduce((memo, el, index) => {
      memo[el] = index;
      return memo;
    }, {});

    this.layers = this.getLayers(this.elements);
  }

  getLayers(elements) {
    if (elements.length === 0) {
      return [['']];
    }

    const layers = [];
    layers.push(elements);

    while (layers[layers.length - 1].length > 1) {
      layers.push(this.getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  getNextLayer(elements) {
    return elements.reduce((layer, el, idx, arr) => {
      if (idx % 2 === 0) {
        const pair = arr[idx + 1];
        if (pair) {
          layer.push(this.combinedHash(el, pair));
        } else {
          layer.push(el);
        }
      }
      return layer;
    }, []);
  }

  static hashPair(a, b) {
    return ethers.keccak256(ethers.solidityPacked(['bytes32', 'bytes32'], [a, b]));
  }

  combinedHash(first, second) {
    if (!first) return second;
    if (!second) return first;
    return MerkleTree.hashPair(first, second);
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(element) {
    let index = this.bufferElementPositionIndex[element];
    if (typeof index !== 'number') {
      throw new Error('Element not found in Merkle tree');
    }

    const proof = [];
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 0;
      const pairIndex = isRightNode ? index + 1 : index - 1;

      if (pairIndex < layer.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          data: layer[pairIndex]
        });
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  static verify(proof, root, element) {
    let computedHash = element;
    
    for (let i = 0; i < proof.length; i++) {
      const proofElement = proof[i];
      
      if (proofElement.position === 'left') {
        computedHash = MerkleTree.hashPair(proofElement.data, computedHash);
      } else {
        computedHash = MerkleTree.hashPair(computedHash, proofElement.data);
      }
    }

    return computedHash === root;
  }
}

module.exports = MerkleTree;
