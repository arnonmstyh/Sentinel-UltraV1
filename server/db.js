const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const Url = sequelize.define('Url', {
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    issuer: {
        type: DataTypes.STRING,
        allowNull: true
    },
    validFrom: {
        type: DataTypes.DATE,
        allowNull: true
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    daysRemaining: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    lastChecked: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.STRING, // 'GOOD', 'WARNING', 'EXPIRED', 'ERROR'
        defaultValue: 'PENDING'
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    starred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    serviceStatus: {
        type: DataTypes.STRING, // 'UP', 'DOWN', 'DEGRADED', 'UNKNOWN'
        defaultValue: 'UNKNOWN'
    },
    responseTime: {
        type: DataTypes.INTEGER, // Response time in milliseconds
        allowNull: true
    },
    httpStatusCode: {
        type: DataTypes.INTEGER, // HTTP status code from health check
        allowNull: true
    },
    lastServiceCheck: {
        type: DataTypes.DATE, // Last time service health was checked
        allowNull: true
    },
    consecutiveFailures: {
        type: DataTypes.INTEGER, // Track consecutive failures for smart polling
        defaultValue: 0
    }
});

const Incident = sequelize.define('Incident', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    severity: DataTypes.STRING,
    status: DataTypes.STRING,
    sourceIP: DataTypes.STRING,
    destinationIPs: DataTypes.JSON, // Store as JSON array
    country: DataTypes.STRING,
    type: DataTypes.STRING,
    responder: DataTypes.STRING,
    responseTime: DataTypes.STRING,
    responseStatus: DataTypes.STRING,
    notes: DataTypes.TEXT,
    timelineEvents: DataTypes.JSON,
    sheetRowHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Optimistic concurrency control. Bumped only by the PUT handler; sync writes do NOT increment this.
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    paranoid: true // Soft delete: destroy() sets deletedAt instead of removing the row.
});

const initDb = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced');
    } catch (error) {
        console.error('Error syncing database:', error);
    }
};

module.exports = { sequelize, Url, Incident, initDb };
