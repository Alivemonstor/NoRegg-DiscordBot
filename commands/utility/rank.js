const { SlashCommandBuilder } = require('discord.js');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('NoRegg\'s current Overwatch 2 Rank.')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('The player\'s username.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('number')
                .setDescription('The player\'s number.')
                .setRequired(true)),
        async execute(interaction) {
        fetch(`https://overfast-api.tekrop.fr/players/${interaction.options.getString('user')}-${interaction.options.getString('number')}`)
            .then(response => response.json())
            .then((data) => {
                if (data.error) {
                    interaction.reply(data.error + ". This user may be private or does not exist.");
                    return;
                }
                console.log(data);
                let rank = 'Unranked';
                if (data.summary.competitive.pc.damage != null) {
                    rank = data.summary.competitive.pc.damage.division + ' ' + data.summary.competitive.pc.damage.tier;
                    rank = rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
                };
                interaction.reply(`${data.summary.username}'s current Overwatch 2 Rank is ${rank} in Season ${data.summary.competitive.pc.season}.`);
            })
            .catch(error => {
                console.error(error);
            });
    },
};