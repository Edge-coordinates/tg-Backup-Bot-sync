pnpm ts-node ./src/bot-local-backup.ts https://t.me/c/1672129277/1 https://t.me/c/1672129277/43889
边缘のWasteLand BackUp

@edge_message_manager_bot

frontail ~/.pm2/logs/myjob-out.log
pm2 logs TG-BACKUP-BOT-SYNC
pm2 delete TG-BACKUP-BOT-SYNC
pm2 stop TG-BACKUP-BOT-SYNC

<!-- pm2 start "pnpm ts-node ./src/bot-local-backup.ts https://t.me/c/1672129277/497 https://t.me/c/1672129277/499"  --name TG-BACKUP-BOT-SYNC -->
pm2 start "NODE_OPTIONS='--no-deprecation' pnpm ts-node ./src/bot-local-backup.ts https://t.me/c/1672129277/1 https://t.me/c/1672129277/43889"  --name TG-BACKUP-BOT-SYNC --no-autorestart


## 废弃指令
<!-- # 可行，但是不使用 -->
pm2 start "npm run dev" --name TG-BACKUP-BOT-SYNC