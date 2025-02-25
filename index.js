const Config = require('./config.json');
const TwitchClass = require('./twitch.js');
const Twitch = new TwitchClass();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const app = express();

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
            setTimeout(() => {
                Twitch.createTwitchSubscription();
            }, 2000);
            Twitch.deleteTwitchSubscriptions();
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

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    const message = req.body;

    console.log('Received webhook message:', JSON.stringify(message, null, 2));

    if (message.challenge) {
        console.log('Responding to challenge:', message.challenge);
        res.status(200).send(message.challenge);
        return Twitch.checkSub();
    }

    const hmac = crypto.createHmac('sha256', Config['TwitchSecret']);
    hmac.update(req.headers['twitch-eventsub-message-id'] + req.headers['twitch-eventsub-message-timestamp'] + JSON.stringify(req.body));
    const signature = `sha256=${hmac.digest('hex')}`;

    if (signature !== req.headers['twitch-eventsub-message-signature']) {
        return res.status(403).send('Forbidden');
    }

    if (message.subscription.type === 'stream.online') {
        const channel = client.channels.cache.get('1341769905288249517');
        if (channel) {
            if (message.event && message.event.broadcaster_user_name) {
                const streamUrl = `https://www.twitch.tv/${message.event.broadcaster_user_name}`;
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`${message.event.broadcaster_user_name} is now live on Twitch!`)
                    .setURL(streamUrl)
                    .setTimestamp();
                channel.send({ embeds: [embed] });
            } else {
                console.error('Error: broadcaster_user_name not found in the event message.');
            }
        }
    }

    res.status(200).send('OK');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
