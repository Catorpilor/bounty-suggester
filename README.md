# 💰 Bounty Price Suggester

AI-powered pricing suggestions for TaskMarket bounties using x402 micropayments.

## Features

- **Smart Pricing**: Analyzes task complexity and market data to suggest optimal bounty prices
- **Complexity Analysis**: Detects factors like TDD requirements, deployment needs, API integrations
- **Market Intelligence**: Uses real TaskMarket data to find comparable completed tasks
- **x402 Payments**: Micropayment-gated API using USDC on Base mainnet

## Endpoints

### POST /v1/suggest ($0.002/call)

Get optimal bounty price suggestions for a task description.

```bash
curl -X POST https://demos.zeh.app/bounty-suggester/v1/suggest \
  -H "Content-Type: application/json" \
  -d '{"description": "Build a REST API with TypeScript and TDD"}'
```

**Response:**
```json
{
  "suggested": {
    "low": 17.50,
    "mid": 25.00,
    "high": 35.00,
    "recommended": 25.00
  },
  "reasoning": "This task has moderate complexity. Key factors identified: TDD/Testing Required. Based on 5 similar completed tasks, the market rate is approximately $25.00. Recommended price: $25.00 USDC. Adjust based on urgency and specific requirements.",
  "comparables": [
    { "description": "Build TypeScript API...", "reward": 25.00, "status": "completed" }
  ],
  "complexity": {
    "score": 42,
    "factors": ["TDD/Testing Required"]
  },
  "confidence": 0.75,
  "freshness": "live"
}
```

### GET /v1/market/stats ($0.001/call)

Get current market pricing statistics.

```bash
curl https://demos.zeh.app/bounty-suggester/v1/market/stats
```

**Response:**
```json
{
  "totalTasks": 150,
  "openTasks": 25,
  "completedTasks": 100,
  "averageReward": 35.50,
  "medianReward": 25.00,
  "minReward": 0.30,
  "maxReward": 250.00,
  "rewardDistribution": {
    "under1": 5,
    "under10": 20,
    "under50": 50,
    "under100": 20,
    "over100": 5
  },
  "freshness": "live",
  "cachedAt": "2024-03-03T12:00:00Z"
}
```

### GET /health (FREE)

Health check endpoint.

## Complexity Factors

The suggester detects these complexity factors and adjusts pricing:

| Factor | Multiplier | Keywords |
|--------|-----------|----------|
| TDD Required | 1.3x | tdd, test-driven, unit tests |
| Deployment | 1.25x | deploy, docker, railway, production |
| API Integration | 1.2x | api integration, webhook, third-party |
| UI/Design | 1.2x | dashboard, ui, ux, responsive |
| Database | 1.15x | database, postgresql, mongodb |
| Blockchain | 1.4x | x402, web3, smart contract, nft |
| Extensive Testing | 1.35x | 30+ tests, integration tests, e2e |
| Documentation | 1.1x | documentation, readme, tutorial |
| CI/CD | 1.15x | ci/cd, github actions, pipeline |
| Security | 1.25x | security, audit, authentication |

## x402 Payment

This API uses x402 micropayments on Base mainnet (USDC).

- **Network**: Base (eip155:8453)
- **Currency**: USDC
- **Facilitator**: https://facilitator.payai.network

To make authenticated requests, use the [x402-fetch](https://www.npmjs.com/package/x402-fetch) library:

```typescript
import { wrapFetchWithPayment, createSigner } from 'x402-fetch';

const signer = await createSigner('base', process.env.PRIVATE_KEY);
const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

const response = await fetchWithPayment('https://demos.zeh.app/bounty-suggester/v1/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'Build a REST API' }),
});
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start development server
bun run dev
```

## Deployment

```bash
# Build and run with Docker
docker build -t bounty-suggester .
docker run -p 3403:3403 \
  -e PAYMENT_ADDRESS=0x85261B8fDDc9c15Abb91c3DFf9f670472825167F \
  bounty-suggester
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3403 |
| PAYMENT_ADDRESS | Wallet address for payments | Required |
| FACILITATOR_URL | x402 facilitator URL | https://facilitator.payai.network |
| NETWORK | Blockchain network | eip155:8453 (Base) |
| TASKMARKET_API_URL | TaskMarket API endpoint | https://api-market.daydreams.systems/api/tasks |

## License

MIT
