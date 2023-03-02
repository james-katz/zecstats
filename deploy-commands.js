const { REST, SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
	.then(() => console.log('Successfully deleted all global application commands.'))
	.catch(console.error);

const commands = [
	new SlashCommandBuilder()
		.setName('zecstats')
		.setDescription('Show cool stats about Zcash.')
		.setDescriptionLocalizations({
			"pt-BR": "Mostra estatísticas sobre a criptomoeda Zcash."
		})
].map(command => command.toJSON());

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} global application commands.`))
	.catch(console.error);