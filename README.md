# Auction Frontend

A Next.js frontend for the auction application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- List of auctions
- Auction detail pages
- MetaMask wallet integration
- Burn transaction functionality
- ZK proof submission

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Homepage
│   └── auction/[id]/      # Auction detail pages
├── components/            # UI components
│   └── ui/               # Shadcn/ui components
├── lib/                  # Utilities and contracts
│   ├── contracts/        # Smart contract interactions
│   └── ethereum/         # Wallet and transaction utilities
└── public/               # Static assets
```

## Dependencies

- Next.js 15.2.4
- React 18
- TypeScript
- Tailwind CSS
- Viem (Ethereum library)
- Radix UI components
