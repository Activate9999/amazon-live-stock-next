:: initialize git (optional)
git init

:: install deps (after you paste package.json content)
npm install

:: prisma
npx prisma generate
npx prisma migrate dev --name init

:: run dev server
npm run dev
