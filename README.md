# GEMINI AI

Live: https://t.me/kysage3_bot

Uses google's gemini api (free tier)

# Credits

- Google
- [Kysage](https://github.com/mohalicious)

# Vps installation
```
curl -fsSL https://deno.land/x/install/install.sh | sh
```

```
git clone https://github.com/kysage1/gemini
```

# Create ```.env``` file and edut this
```
BOT_TOKEN=your_bot_token
OWNERS=owner_id1 owner_id2
MONGO_URL=mongodb://localhost:27017
DEFAULT_API_KEY=your_default_api_key
```
```

# For polling mode:
```
deno run -A main.ts --polling
```

# For webhook mode:
```
deno run -A main.ts
```

# Using pm2:
```
npm install -g pm2

pm2 start --interpreter=deno main.ts -- --polling
               
               or

pm2 start --interpreter=deno main.ts
```               
