-- CreateTable
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    password TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"(email);
