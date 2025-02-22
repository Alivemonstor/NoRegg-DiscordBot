const Config = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const { EmbedBuilder, Client, Collection, GatewayIntentBits, MessageActionRow, MessageButton, Events, REST, Routes} = require("discord.js");


class Bot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });
        this.commands = new Collection();
    }

    start() {
        this.login(Config['Token']);

        this.on('ready', () => {
            console.log('I am ready!');
        });

        
        this.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                }
            }
        });
    }
}

const client = new Bot();

client.start();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}


client.on('guildMemberAdd', guildMemberAdd => {
    const embed = new EmbedBuilder()
	.setColor(0x0099FF)
	.setTitle('Welcome to the server!')
	.setDescription(`Welcome to the server ${guildMemberAdd.user.username}`)
	.setImage(guildMemberAdd.user.displayAvatarURL({ dynamic: true }))
	.setTimestamp()
    guildMemberAdd.guild.channels.cache.get('1342283608387358811').send({ embeds: [embed] }); 
});

client.on('guildMemberRemove', guildMemberRemove => {
    const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Goodbye!')
    .setDescription(`Goodbye ${guildMemberRemove.user.username}`)
    .setImage(guildMemberRemove.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    guildMemberRemove.guild.channels.cache.get('1342283608387358811').send({ embeds: [embed] }); 
});
