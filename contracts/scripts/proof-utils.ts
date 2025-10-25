import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility functions for handling zero-knowledge proof data
 * Specifically handles the conversion between snarkjs and Solidity proof formats
 */

// Utility function to convert snarkjs G2 format to Solidity format
// snarkjs outputs: [[x0,x1],[y0,y1]]
// Solidity expects: [[x1,x0],[y1,y0]]
export function convertG2Format(snarkjsG2: string[][]): string[][] {
  return [
    [snarkjsG2[0][1], snarkjsG2[0][0]], // [x1, x0]
    [snarkjsG2[1][1], snarkjsG2[1][0]]  // [y1, y0]
  ];
}

// Convert entire proof from snarkjs format to Solidity format
export function convertProofFormat(proofData: any) {
  return {
    pi_a: proofData.pi_a.slice(0, 2), // First two elements for G1
    pi_b: convertG2Format(proofData.pi_b.slice(0, 2)), // Convert G2 format
    pi_c: proofData.pi_c.slice(0, 2), // First two elements for G1
    protocol: proofData.protocol,
    curve: proofData.curve
  };
}

// Load and convert proof data from files
export function loadAndConvertProof(proofPath: string, publicPath: string) {
  const proofData = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const publicSignals = JSON.parse(fs.readFileSync(publicPath, "utf8"));
  
  const convertedProof = convertProofFormat(proofData);
  
  return {
    proofA: convertedProof.pi_a,
    proofB: convertedProof.pi_b,
    proofC: convertedProof.pi_c,
    publicSignals: publicSignals
  };
}

// Validate proof format
export function validateProofFormat(proofData: any): boolean {
  try {
    // Check if proof has required fields
    if (!proofData.pi_a || !proofData.pi_b || !proofData.pi_c) {
      return false;
    }
    
    // Check G1 format (should have 2 elements)
    if (proofData.pi_a.length < 2 || proofData.pi_c.length < 2) {
      return false;
    }
    
    // Check G2 format (should be 2x2 array)
    if (proofData.pi_b.length < 2 || proofData.pi_b[0].length < 2 || proofData.pi_b[1].length < 2) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Example usage function
export function exampleUsage() {
  const proofPath = path.join(__dirname, "../data/proof.json");
  const publicPath = path.join(__dirname, "../data/public.json");
  
  if (fs.existsSync(proofPath) && fs.existsSync(publicPath)) {
    const { proofA, proofB, proofC, publicSignals } = loadAndConvertProof(proofPath, publicPath);
    
    console.log("Converted proof format:");
    console.log("Proof A:", proofA);
    console.log("Proof B:", proofB);
    console.log("Proof C:", proofC);
    console.log("Public Signals:", publicSignals);
    
    return { proofA, proofB, proofC, publicSignals };
  } else {
    console.log("Proof data files not found");
    return null;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}
