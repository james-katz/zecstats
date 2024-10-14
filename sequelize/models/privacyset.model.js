const { DataTypes } = require('sequelize');

// We export a function that defines the model.
// This function will automatically receive as parameter the Sequelize connection object.
module.exports = (sequelize) => {
	sequelize.define('privacyset', {
		// The following specification of the 'id' attribute could be omitted
		// since it is the default.
		id: {
			type: DataTypes.INTEGER,
			allowNull: false,			
			primaryKey: true,		
			autoIncrement: true				
		},
		// Height snaptshot
		height: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// Sapling transactions
		sapling: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},		
		// Sapling transactions, spam filtered
		sapling_filter: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// Orchard transactions
		orchard: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// Orchard transactions, spam filtered
		orchard_filter: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// Total number of transactions
		transactions: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// Total number of transactions, spam filtered
		transactions_filter: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
	});
};