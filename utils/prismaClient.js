require('dotenv').config()

const {PrismaClient} = require('../prisma/generated/prisma/client')
const {env} = require('prisma/config')
const prisma = new PrismaClient();

module.exports = prisma;
