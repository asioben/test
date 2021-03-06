const Discord = require("discord.js")
const config = require("../../config.json")
const data = require("../../database.json")
const color = require("../../color.json")
const permissions = require("../../permissions.json")
const ms = require("ms")
const pretty = require("pretty-ms")
const db = require("quick.db")
const fs = require("fs")
const embed = require("../../functions/embed/main")
const language = require("../../lang.json")
const logs = require('../../functions/logs/main')
const moment = require('moment')
const axios = require('axios')
const backup = require('discord-backup')
backup.setStorageFolder(__dirname + "/backups")
getNow = () => { return { time: new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }), }; };
module.exports.run = async (client, message, args, prefix, perm, whitelisted, database, database2, lang) => {
    try {
        await CmdExist(database, message, this.help.name).then(async () => {
            await database.query("SELECT * FROM commands WHERE serverid = ? AND name = ?", [message.guild.id, this.help.name], async (error, result) => {
                var canaccess = false
                try {
                    if (error) return message.reply(language[lang].error + error)
                    if (!result[0]) canaccess = true
                    if (result[0].perm == '0') canaccess = true
                    if (result[0].perm == '1') if (perm[0]) canaccess = true
                    if (result[0].perm == '2') if (perm[0] || perm[1]) canaccess = true
                    if (result[0].perm == '3') if (perm[0] || perm[1] || perm[2]) canaccess = true
                    if (result[0].perm == 'giveaway') if (perm[3]) canaccess = true
                    if (result[0].perm == 'mention everyone') if (perm[4]) canaccess = true
                    if (result[0].perm == 'whitelist') if (whitelisted) canaccess = true
                    if (result[0].perm == 'owner') if (config.owners.includes(message.author.id) || config.buyer == message.author.id || config.creator == message.author.id) canaccess = true
                    if (result[0].perm == 'buyer') if (config.buyer == message.author.id || config.creator == message.author.id) canaccess = true
                    if (result[0].perm == 'kick/ban') {
                        await database.query("SELECT * FROM roles WHERE serverid = ?", message.guild.id, async function (error, result, fields) {
                            if (error || result < 1) return message.reply(lang.undefinederror)
                            let myrole = result[0].ban
                            if (!message.guild.roles.cache.has(myrole)) return embed.simple(client, message, 'Perm kick/ban', message.guild.iconURL({ dynamic: true }), lang.rolebanproblem, color.orangered, message.channel)
                            let pban = message.guild.roles.cache.get(myrole).name
                            if (message.member.roles.cache.has(myrole)) canaccess = true
                        })
                    }
                    if (!canaccess) return message.channel.send(language[lang].permissionmissing + `**\`perm ${result[0].perm} minimum\`**`)
                    var lang2 = lang
                    var botaccess = true
                    var botperm = this.help.access_bot.map(i => ` \`${permissions.fr[i]}\` |`)
                    if (this.help.access_bot.length > 0) {
                        await this.help.access_bot.map(i => {
                            if (!message.guild.me.hasPermission(i)) return botaccess = false
                        })
                        lang = language[`${lang}`]
                        if (!botaccess) return embed.permissionMissing(client, message, botperm, lang.botpermissionmissing)
                    }
                    lang = language[`${lang2}`]


                    if (!args[0] && args[0] != 'info' && args[0] != 'create' && args[0] != 'load') return embed.helpargs(client, message, this.help.name + " - " + lang.invalidargs, this.help.usage, prefix)
                    let backupID
                    switch (args[0]) {
                        case 'load':
                            backupID = args[1];
                            if (!backupID) {
                                return message.channel.send(":x: | " + lang.by == 'by' ? "You must specify a valid backup ID !" : "Vous devez me donner un ID de backup valide !");
                            }
                            backup.fetch(backupID).then(async () => {
                                message.channel.send(":warning: | " + lang.by == 'by' ? "When the backup is loaded, all the channels, roles, etc... will be replaced! React with ??? to confirm! If the action don't work, try to load an other time after 20sec." : "Lorsque la backup sera charg??e, tout les salons, r??les, etc... seront remplac?? ! R??agit avec ??? pour confirm?? ! Si la backup ne fonctionne pas r??essayez 20sec apr??s.").then(m => {
                                    m.react("???")
                                    const filtro = (reaction, user) => {
                                        return ["???"].includes(reaction.emoji.name) && user.id == message.author.id;
                                    };
                                    m.awaitReactions(filtro, {
                                        max: 1,
                                        time: 20000,
                                        errors: ["time"]
                                    }).catch(() => {
                                        m.edit(":x: | " + lang.by == 'by' ? "Time's up! Cancelled backup loading!" : "Temps ??coul?? ! Chargement de la backup annul??e.");
                                    }).then(coleccionado => {
                                        const reaccion = coleccionado.first();
                                        if (reaccion.emoji.name === "???") {
                                            message.author.send(":white_check_mark: | " + lang.by == 'by' ? "Start loading the backup!" : "Je commence ?? charg?? la backup !").catch(e => { return })
                                            backup.load(backupID, message.guild).then(() => {
                                                backup.remove(backupID);
                                                return message.author.send(':white_check_mark: | Chargement de la backup termin?? !').catch(e => { return })
                                            }).catch((err) => {
                                                return message.author.send(":x: | " + lang.by == 'by' ? "Sorry, an error occurred... Please check that I have administrator permissions!" : "D??sol??, une erreur a ??t?? rencontr??e... Merci de v??rifier si j'ai bien les permissions administrateurs !").catch(e => { return })
                                            });
                                        };
                                    })
                                })
                            }).catch(e => { return message.reply(lang.by == 'by' ? 'No backup found.' : 'Pas de backup trouv??.') })
                            break;
                        case 'info':
                            backupID = args[1];
                            if (!backupID) {
                                return message.channel.send(":x: | " + lang.by == 'by' ? "You must specify a valid backup ID !" : "Vous devez me donner un ID de backup valide !");
                            }
                            backup.fetch(backupID).then((backupInfos) => {
                                const date = new Date(backupInfos.data.createdTimestamp);
                                const yyyy = date.getFullYear().toString(),
                                    mm = (date.getMonth() + 1).toString(),
                                    dd = date.getDate().toString();
                                const formatedDate = `${(dd[1] ? dd : "0" + dd[0])}/${(mm[1] ? mm : "0" + mm[0])}/${yyyy}`;
                                let embed2 = new Discord.MessageEmbed()
                                    .setAuthor("Backup Informations")
                                    .addField("Backup ID", backupInfos.id, false)
                                    .addField(lang.by == 'by' ? "Server ID" : "Serveur ID", backupInfos.data.guildID, false)
                                    .addField(lang.by == 'by' ? "Size" : "Taille", `${backupInfos.size} mb`, false)
                                    .addField(lang.by == 'by' ? "Created at" : "Cr???? le", formatedDate, false)
                                    .setColor(color.gold);
                                message.channel.send(embed2);
                            }).catch((err) => {
                                // if the backup wasn't found
                                return message.channel.send(":x: | " + lang.by == 'by' ? "No backup found for `" + backupID + "`!" : "Aucune backup pour `" + backupID + "`!");
                            });
                            break;
                        case 'create':
                            message.channel.send(lang.by == 'by' ? "Creating backup..." : "Cr??ation de la backup...").then(message1 => {

                                backup.create(message.guild, {
                                    jsonBeautify: true,
                                    maxMessagesPerChannel: 0

                                })
                                    .then(backupData => {
                                        message1.edit(new Discord.MessageEmbed()
                                            .setAuthor(lang.by == 'by' ? `Backup created successfully` : `Backup cr???? avec succ??s`)
                                            .setColor(color.green)
                                            .setThumbnail(message.author.displayAvatarURL())
                                            .setDescription(lang.by == "by" ? "**The backup ID has been sent to the buyer**" : "**L'id de la backup a ??t?? envoy?? ?? mon acheteur**")
                                            .setFooter(lang.by == "by" ? `To load backup, use ${prefix}backup load ${backupData.id}` : `Pour charger la backup, utilis?? ${prefix}backup load ${backupData.id}`));
                                        message.author.send("Voici l'id de votre backup : \`" + backupData.id + "\` ! Mettez la en lieu s??r.")
                                    });
                            })
                            break;
                    }


                } catch (err) { console.log(this.help.name.toUpperCase() + " : " + err) }
            })
        })
    } catch (err) {
        console.log(this.help.name.toUpperCase() + " : " + err)
    }
}

// return embed.helpargs(client, message, this.help.name + " - " + lang.invalidargs, this.help.usage, prefix)

module.exports.help = {
    name: "backup",
    aliases: [`back`, `save`],
    desc: ["Charge une sauvegarde d'un autre serveur", "Load a save of an other server"],
    access_member: [""],
    access_bot: ["SEND_MESSAGES", "EMBED_LINKS", "ADMINISTRATOR"],
    usage: ["backup create", "backup load <id d'une backup>", "backup info <id d'une backup>"],
    type: ["Configuration", "Setup"],
    perm: "buyer"
}

async function CmdExist(database, message, cmdname) {
    await database.query("SELECT * FROM commands WHERE serverid = ? AND name = ?", [message.guild.id, cmdname], async (error, result) => {
        if (error) return console.log(cmdname.toUpperCase() + ' : ' + error)
        if (result[0]) return
        var val = [[message.guild.id, cmdname, 'buyer']]
        return database.query("INSERT INTO commands (serverid, name, perm) VALUES ?", [val])
    })
}