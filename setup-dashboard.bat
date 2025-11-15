@echo off
echo =======================================
echo  Dashboard Setup Script
echo =======================================
echo.

echo Step 1: Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)
echo ✓ Prisma client generated successfully
echo.

echo Step 2: Running database migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Migration failed - Database might not be available
    echo You can run migrations later with: npx prisma migrate deploy
    echo.
) else (
    echo ✓ Database migrations applied successfully
    echo.
)

echo Step 3: Checking database connection...
call npx prisma db pull --force
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Cannot connect to database
    echo Please check your DATABASE_URL in .env file
    echo.
) else (
    echo ✓ Database connection successful
    echo.
)

echo =======================================
echo  Setup Complete!
echo =======================================
echo.
echo Next steps:
echo 1. Start the development server: npm run dev
echo 2. Open http://localhost:3000 in your browser
echo 3. Register a new account or login
echo 4. Start using the comprehensive dashboard!
echo.
echo See DASHBOARD_FEATURES.md for full feature documentation
echo.
pause
