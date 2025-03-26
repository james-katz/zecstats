const { Client, GatewayIntentBits, ModalSubmitInteraction, EmbedBuilder, AttachmentBuilder, enableValidators, CommandInteractionOptionResolver, Utils } = require('discord.js');
const CoinGecko = require('coingecko-api');
const axios = require('axios');

const native = require('./index.node');
const grpc = require('./grpc_connector');
const lc = grpc.init('zec.rocks:443');   //na-ewr.

const sequelize = require('./sequelize');
const { Op } = require('sequelize');

const SAPLING_ACTIVATION = 419200;
const ORCHARD_ACTIVATION = 1687104;
const SYNC_PERIOD = 1152; // 1152 is roughly a day

let txSummaryLock = false;
let dbSyncLock = false;

let halvingTimer;
let halvingTimerLock = false;
// let channel, channelId;

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');

const { v4: uuidv4 } = require('uuid');

const dotenv = require('dotenv');
const coingeckoApi = require('coingecko-api');

dotenv.config();
const CoinGeckoClient = new CoinGecko();
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 1000, height: 600, backgroundColour: '#2f3136'});

const channelId = process.env.PRICE_CHANNEL_ID;

const client = new Client({
    intents: [
       GatewayIntentBits.Guilds,
       GatewayIntentBits.GuildMessages,   
       GatewayIntentBits.MessageContent
   ],
});
console.log("Booting...");

client.once('ready', async () => {
    console.log("Ready!");
    // Assert database connection
    console.log(`Checking database connection...`);
	try {
		await sequelize.authenticate();
        // If connection is Ok, do initial database sync
        initDb();
	} catch (error) {
		console.log('Unable to connect to the database:', error.message);
		process.exit(1);
	}

    // price widget
    handleZecPriceChannel();
    setInterval(() => {
        handleZecPriceChannel();
    }, 5 * 60 * 1000);
});

async function handleZecPriceChannel() {
    const channel = await client.channels.fetch(channelId);
    if(channel) {
        console.log(`Zec price widget configured at ${channelId}`);
    }
    else {
        console.log(`Invalid channel ${channelId}`);
        return;
    }
    
    try {      
        const res = await fetchCoinGECKO();
        if(res) {
            const zecPrice = res.data.market_data.current_price.usd.toLocaleString('en-US');
            const priceChange1h = res.data.market_data.price_change_percentage_1h;
            const emojiUp = "🟢 ↗";;
            const emojiDown = "🔴 ↘️";
            const header = priceChange1h >= 0 ? emojiUp : emojiDown;
            const channelName = `${header} ZEC : $ ${zecPrice}`;
            channel.edit({name: `${channelName}`}).then((c) => {
                console.log(`Channel edited, new name: ${channelName}`);
            }).catch((err) => { throw err });
        }
    }
    catch(err) {
        console.log(err);
    }
}

const languages = {
    pt: {
        title: 'Zcash - Estatísticas',
        description: 'Estatísticas sobre a criptomoeda Zcash.',
        ticker: 'Moeda',
        symbol: 'Símbolo',
        algo: 'Algorítimo',
        market_usd: 'Preço de mercado (usd)',
        market_btc: 'Preço de mercado (btc)',
        market_brl: 'Preço de mercado (brl)',
        price_low: 'Menor preço 24h',
        price_high: 'Maior preço 24h',
        price_percent: 'Flutuação 24h',
        atl_price: 'Baixa histórica (usd)',
        atl_date: 'Data',
        atl_change: 'Variação',
        ath_price: 'Alta histórica (usd)',
        ath_date: 'Data',
        ath_change: 'Variação',
        market_cap: 'Capitalização de mercado',
        market_cap_rank: 'Posição ',
        max_supply: 'Fornecimento máximo',
        circulation: 'Em circulação',
        block_height: 'Altura do bloco',
        full_node: 'Full nodes (aprox.)',
        wallets_hodl: 'Total de carteiras (*hodling*)',
        chain_size: 'Tamanho da blockchain',
        blocks_mined: 'Blocos minerados 24h',
        hashrate: 'Hashrate da rede',
        volume: 'Volume 24h',
        credits: 'Dados fornecidos por CoinGecko e BlockChair',
        cd_title: 'Zcash Halving Contagem Regressiva',
        cd_description: 'Estatísticas sobre o próximo halving da Zcash',
        cd_curr_height: 'Altura do bloco atual',
        cd_halv_height: 'Altura do bloco do Halving',
        cd_curr_subsidy: 'Recompensa atual',
        cd_halv_subsidy: 'Recompensa após o Halving',
        cd_remain_blocks: 'Blocos restantes',
        cd_date: 'Quando será o halving?',
        cd_countdown: 'Contagem Regressiva',
        cd_aprox_date: 'As datas são aproximadas, baseadas no tempo médio do bloco.',
        cd_sec: ' segundo.',
        cd_secs: ' segundos.',
        cd_min: ' minuto ',
        cd_mins: ' minutos ',
        cd_hours: ' horas ',
        cd_hour: ' hora ',
        cd_day: ' dia ',
        cd_days: ' dias '
    },
    en: {
        title: 'Zcash - Stats',
        description: 'Zcash Cryptocurrency Statistics.',
        ticker: 'Ticker',
        symbol: 'Symbol',
        algo: 'Algorithm',
        market_usd: 'Market price (usd)',
        market_btc: 'Market price (btc)',
        market_brl: 'Market price (brl)',
        price_low: 'Lowest price 24h',
        price_high: 'Highest price 24h',
        price_percent: 'Change 24h',
        atl_price: 'All time low (usd)',
        atl_date: 'Date',
        atl_change: 'Change',
        ath_price: 'All time high (usd)',
        ath_date: 'Date',
        ath_change: 'Change',
        market_cap: 'Market cap.',
        market_cap_rank: 'Rank ',
        max_supply: 'Max. Supply',
        circulation: 'Circulating',
        block_height: 'Block height',
        full_node: 'Full nodes (approx.)',
        wallets_hodl: 'Number of wallets (*hodling*)',
        chain_size: 'Blockchain size',
        blocks_mined: 'Mined blocks 24h',
        hashrate: 'Network Hashrate',
        volume: 'Volume 24h',
        credits: 'All data provided by CoinGecko and BlockChair',
        cd_title: 'Zcash Halving Countdown',
        cd_description: 'Statistics about Zcash Halving.',
        cd_curr_height: 'Current height',
        cd_halv_height: 'Halving height',
        cd_curr_subsidy: 'Current block reward',
        cd_halv_subsidy: 'Block reward after halving',
        cd_remain_blocks: 'Remaining blocks',
        cd_date: 'When it will happen?',
        cd_countdown: 'Countdown',
        cd_aprox_date: 'Dates are approximated based on block time average.',
        cd_sec: ' second.',
        cd_secs: ' seconds.',
        cd_min: ' minute ',
        cd_mins: ' minutes ',
        cd_hours: ' hours ',
        cd_hour: ' hour ',
        cd_day: ' day ',
        cd_days: ' days '        
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    if(commandName === 'zecstats') {
        interaction.deferReply();
        const local = interaction.locale == 'pt-BR' ? languages.pt : languages.en;
        
        let bc;
        try {
            bc = await axios.get('https://api.blockchair.com/zcash/stats');
        } catch(err) {
            interaction.editReply('BlockChair API is unavaiable.\n' + err);
            return;
        }
                
        const blockChair = bc.data;

        const res = await fetchCoinGECKO();

        if(!res || !res.success) {
            await interaction.editReply('CoinGecko API is unavaible.\n');
            return;
        }
        const [chart, uuid] = await createChart();
        
        const attach = new AttachmentBuilder(chart, {name: uuid+'.png'});
                
        const zcashEmbed = new EmbedBuilder()
            .setColor(0xf4b728)
            .setAuthor({name: local.title, iconURL: res.data.image.thumb})
            .setDescription(local.description)
            // .setThumbnail(res.data.image.large)            
            .addFields([
                {name: local.ticker, value: res.data.name, inline: true},
                {name: local.symbol, value: res.data.symbol, inline: true},
                {name: local.algo, value: res.data.hashing_algorithm, inline: true}
            ])
            .addFields([
                {name: local.market_usd, value: '$ '+res.data.market_data.current_price.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.market_btc, value: '₿ '+JSON.stringify(res.data.market_data.current_price.btc), inline: true},
                {name: local.market_brl, value: 'R$ '+res.data.market_data.current_price.brl.toLocaleString(interaction.locale || 'en-US'), inline: true}
            ])
            .addFields([
                {name: local.price_low, value: '$ '+res.data.market_data.low_24h.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.price_high, value: '$ '+res.data.market_data.high_24h.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.price_percent, value: res.data.market_data.price_change_percentage_24h.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.atl_price, value: '$ '+res.data.market_data.atl.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_date, value: new Date(res.data.market_data.atl_date.usd).toLocaleDateString(interaction.locale || 'en-US'), inline: true},
                {name: local.atl_change, value: res.data.market_data.atl_change_percentage.usd.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.ath_price, value: '$ '+res.data.market_data.ath.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_date, value: new Date(res.data.market_data.ath_date.usd).toLocaleDateString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_change, value: res.data.market_data.ath_change_percentage.usd.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.market_cap, value: '$ '+res.data.market_data.market_cap.usd.toLocaleString(interaction.locale || 'en-US') + ' ('+ local.market_cap_rank + res.data.market_cap_rank+')', inline: true},
                {name: local.max_supply, value: res.data.market_data.max_supply.toLocaleString(interaction.locale || 'en-US') + ' ZEC', inline: true},
                {name: local.circulation, value: Math.floor(res.data.market_data.circulating_supply).toLocaleString(interaction.locale || 'en-US') + ' ZEC', inline: true}
            ])
            .addFields([
                {name: local.block_height, value: blockChair.data.blocks.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.full_node, value: blockChair.data.nodes.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.wallets_hodl, value: blockChair.data.hodling_addresses.toLocaleString(interaction.locale || 'en-US'), inline: true}
            ])
            .addFields([
                {name: local.chain_size, value: (blockChair.data.blockchain_size/1000000000).toLocaleString(interaction.locale || 'en-US') + ' GB', inline: true},                
                {name: local.blocks_mined, value: blockChair.data.blocks_24h.toLocaleString(), inline: true},
                {name: local.hashrate, value: (blockChair.data.hashrate_24h/1000000000).toLocaleString(interaction.locale || 'en-US') + ' GH/s', inline: true}
            ])
            .addFields([
                {name: local.volume, value: '$ '+res.data.market_data.total_volume.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},                
            ])
            .setImage('attachment://'+uuid+'.png')
            .setTimestamp()
            .setFooter({text: local.credits})
            
        await interaction.editReply({embeds: [zcashEmbed], files: [attach]})
        .catch(err => {            
            console.log(err);
        })
    }

    if(commandName == 'zcountdown') {
        await interaction.deferReply();
        const local = interaction.locale == 'pt-BR' ? languages.pt : languages.en;

        let res;
        try {
            res = await axios.get('http://13.58.71.62:3001/');
        } catch(err) {
            interaction.editReply('Countdown API is unavaiavle.\n' + err);
            return;
        };
        
        const countdown = res.data;
        
        const d = countdown.countdown.days;
        const h = countdown.countdown.hours;
        const m = countdown.countdown.mins;
        const s = countdown.countdown.secs;
        
        const remaining = d + (d > 1 ? local.cd_days : local.cd_day) + h + (h > 1 ? local.cd_hours : local.cd_hour) + m + (m > 1 ? local.cd_mins : local.cd_min) + s + (s > 1 ? local.cd_secs : local.cd_sec);
        const halvingDate = new Date(countdown.halving_date);
        
        const countdownEmbed = new EmbedBuilder()
            .setTitle(local.cd_title)
            .setColor(0x2e93a1)
            .setDescription(local.cd_description)
            .addFields([
                {name: local.cd_curr_height, value: countdown.height.toLocaleString(), inline: true},
                {name: local.cd_halv_height, value: countdown.next_halving.toLocaleString(), inline: true},
                {name: local.cd_remain_blocks, value: countdown.remaining_blocks.toLocaleString(), inline: true},
            ])
            .addFields([
                {name: local.cd_curr_subsidy, value: (countdown.current_subsidy / 10**8).toLocaleString() + ' ZEC', inline: true},
                {name: local.cd_halv_subsidy, value: (countdown.next_subsidy / 10**8).toLocaleString() + ' ZEC', inline: true},
            ])
            .addFields([
                {name: local.cd_date, value: '🗓️ ' + (halvingDate.toLocaleDateString(interaction.locale) + ' 🕙 ' + halvingDate.toLocaleTimeString(interaction.locale, {timeZone: 'Etc/UTC', timeStyle: 'short'}) + ' (UTC)')},
                {name: local.cd_countdown, value: remaining}
            ])
            .setFooter({text: local.cd_aprox_date})
            .setTimestamp();

        await interaction.editReply({embeds:[countdownEmbed]}).catch();
    }
});

async function createChart() {
    const res = await CoinGeckoClient.coins.fetchMarketChart('zcash', {days: 1, vs_currency: 'usd'});
    const mapped = res.data.prices.map(el => {
        let m = {};
        m.x = new Date(el[0]).toLocaleTimeString();
        m.y = el[1];
        return m
    });
    
    const data = {
        //labels: mapped,
        datasets: [
            {
                label: 'Price $ZEC 24h',
                data: mapped,
                borderColor: '#f4b724',
                backgroundColor: '#f4b72444',
                fill: 'start',
                pointRadius: 0,
                borderWidth: 2
            }
        ]
    }
    
    const chartConfig = {
        type: 'line',
        data: data,
        options: {
            plugins: {
            filler: {
                propagate: false,
            },
            title: {
                display: false,
                text: (ctx) => 'Fill: ' + ctx.chart.data.datasets[0].fill
            }
            },
            interaction: {
            intersect: false,
            }
        }
    }
    const buffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
    const uuid = uuidv4();
    return [buffer, uuid];
}

async function fetchCoinGECKO() {
    let res;    
    try {
        res = await CoinGeckoClient.coins.fetch('zcash', {
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            localization: false,
            sparkline: false
        });
    }
    catch(err) {
        console.log(err);
    }
    return res;
}

client.on('messageCreate', async (i) => {
    if(i.author.bot) return;
    const cmd = i.content.split(' ');

    // if(cmd[0].toLowerCase() == "^halving") {
    //     if(cmd[1] && i.author.id == "290336959627395072") {            
    //         channelId = cmd[1];
    //         channel = await i.guild.channels.fetch(channelId);
    //         if(channel) {
    //             await i.reply(`Halving countdown configured at <#${channelId}>`);
    //         }
    //         else {
    //             await i.reply(`Invalid channel <#${channelId}>`);
    //             return;
    //         }

    //         halvingTimer = setInterval(async () => {               
    //             if(halvingTimerLock) {
    //                 console.log('not done yet, shit')
    //                 return;
    //             }
    //             try {      
    //                 halvingTimerLock = true;
    //                 const res = await axios.get('http://13.58.71.62:3001/', {
    //                     timeout: 5000 // Timeout of 5 seconds
    //                 });

    //                 if(res && res.status == 200) {
    //                     const days = String(res.data.countdown.days);
    //                     const hours = String(res.data.countdown.hours);
    //                     const mins = String(res.data.countdown.mins).padStart(2, '0');
    //                     const secs = String(res.data.countdown.secs).padStart(2, '0');

    //                     const channelName = `📅 ${days} Days, ${hours}h, ${mins}m, ${secs}s`
    //                     // const halvDate = new Date(res.data.halving_date);
    //                     // const channelName = `📅 ${halvDate.toLocaleDateString()} ${halvDate.toLocaleTimeString()}`
    //                     // console.log(`${channelName}`)                        
                       
    //                     const lChannel = await i.guild.channels.fetch(channelId);                         
    //                     // console.log(lChannel.name)

    //                     lChannel.edit({name: `${channelName}`}).then((c) => {
    //                         console.log(c.name);
    //                         halvingTimerLock = false;
    //                     }).catch((e) => {console.log(e)});

    //                     setTimeout(() => {
    //                         halvingTimerLock = false;
    //                     }, 3 * 60 * 1000);

    //                     // const lChannel2 = await i.guild.channels.fetch(channelId); 
    //                     // console.log(lChannel2.name)
    //                 }
    //                 else {
    //                     console.log("No response from server");
    //                     halvingTimerLock = false;
    //                 }
    //             }
    //             catch(e) {
    //                 halvingTimerLock = false;

    //                 console.log(e);
    //             }                
    //         }, 75 * 1000)                        
    //     }
    //     else {
    //         await i.reply(`You don't have permission for this.`);
    //     }
    // }

    if(cmd[0].toLowerCase() == '$zconvert' || cmd[0].toLowerCase() == '$zconv') {
        const validFiat = await CoinGeckoClient.simple.supportedVsCurrencies();
        let amountZec = parseFloat(cmd[1].replace(/,/g,'.'));
        const convertFrom = cmd[2];
        const currency = cmd[4];

        if(isNaN(amountZec) || !cmd[4]) {
            await i.reply({embeds: [{                
                title: '🚫 Command error!',
                color: 0xff0000,
                description: `I didn't understand your command.\nTo convert **ZEC** amount to fiat currency try the following command:\n\`$zconvert <amount> ZEC to <fiat_currency>\``
            }]});
            return;
        }

        let currencyError = false;
        if(convertFrom.toLocaleLowerCase() === 'zec') {
            if(!validFiat.data.includes(currency.toLowerCase())) currencyError = true;
        }
        else {
            if(!validFiat.data.includes(convertFrom.toLowerCase())) currencyError = true;
            // if(currency.toLowerCase() !== 'zec') currencyError = true;
        }

        if(currencyError) {
            await i.reply({embeds: [{                
                title: '🚫 Currency error!',
                color: 0xff0000,
                description: `Sorry, ${convertFrom.toLowerCase() === 'zec' ? currency : convertFrom} is not recognized as a valid fiat currency.`
            }]});
            return;
        }

        const zecPrice = await CoinGeckoClient.simple.price({
            ids: 'zcash',
            vs_currencies: (convertFrom.toLowerCase() === 'zec' ? currency.toLowerCase() : convertFrom.toLowerCase())
        });

        if(convertFrom.toLowerCase() !== 'zec') {
            amountZec = amountZec / Object.values(zecPrice.data.zcash);
        }

        if(amountZec <= 0 || amountZec > 21000000) {
            await i.reply({embeds: [{                
                title: '🚫 Amount error!',
                color: 0xff0000,
                description: `This is not a valid ZEC amount.\nPlease provide an amount greater than *zero* and less than 21 million.`
            }]});
            return;
        }     
        
        await i.reply({embeds: [{                
            title: '<:zcash:1060629265961472080> ZEC conversion tool',
            color: 0xf4b728,
            description: `You're converting **${cmd[1]} ${convertFrom.toUpperCase()}** to **${currency.toUpperCase()}**.`,
            fields: [
                {name: 'ZEC amount', value: `<:zcash:1060629265961472080> ${amountZec} ZEC`, inline: true},
                {name: `Equivalent in ${convertFrom.toLowerCase() === 'zec' ? currency.toUpperCase() : convertFrom.toUpperCase()}`, value: `$ ${(Object.values(zecPrice.data.zcash) * amountZec).toLocaleString()} ${convertFrom.toLowerCase() === 'zec' ? currency.toUpperCase() : convertFrom.toUpperCase()}`, inline: true}
            ]
        }]});
    }
    else if(cmd[0].toLocaleLowerCase() == '!txinfo') {
        const txid = cmd[1].toString();
        if(!txid || txid == '') {
            await i.reply("Please provide a transaction id.");
            return;
        }

        axios.get(`https://api.3xpl.com/zcash/transaction/${txid}?data=transaction,events&limit=100&mixins=stats`, {
            headers: {
                'Authorization': 'Bearer 3A0_t3st3xplor3rpub11cb3t4efcd21748a5e'
            }        
        }).then(async (res) => {
            const best_height = res.data.mixins.stats.zcash.best_block;
            const in_block = res.data.data.transaction.block;
            const events = res.data.data.events;
            const voidAddr = events['zcash-main'].filter((t) => t.address == "the-void");
            const fee = (voidAddr[0] ? voidAddr[0].effect : '0');
            let inputs = [];
            let outputs = [];

            events['zcash-main'].forEach((t) => {
                if(parseFloat(t.effect) < 0) inputs.push(`- **${t.address.startsWith('t') ? 'transparent-pool' : t.address}**\n  - ${parseFloat(t.effect / 10**8).toFixed(8)} ZEC`)
                else if(parseFloat(t.effect) >= 0 && t.address != "the-void") outputs.push(`- **${t.address.startsWith('t') ? 'transparent-pool' : t.address}**\n  - ${parseFloat(t.effect / 10**8).toFixed(8)} ZEC`)
            });

            let trimInput = [];
            if(inputs.length > 8) {
                for(let i = 0; i < 8; i ++) {
                    trimInput.push(inputs[i]);
                }
                trimInput[8] = `- **And ${inputs.length - 8} more ...**`;
            }
            else trimInput = inputs;

            let trimOutput = [];
            if(outputs.length > 8) {
                for(let i = 0; i < 8; i ++) {
                    trimOutput.push(outputs[i]);
                }
                trimOutput[8] = `- **And ${outputs.length - 8} more ...**`;
            }
            else trimOutput = outputs;

            const txEmbed = new EmbedBuilder()
            .setColor(0xf4b728)
            .setAuthor({name: "Transaction details", iconURL: "https://bitzecbzc.github.io/wp-content/uploads/2019/03/zcash-icon-black.png"})
            // .setTitle(`Transaction details`)
            .setDescription(`Details for transaction id [${txid}](https://3xpl.com/zcash/transaction/${txid})`)
            .setThumbnail("https://bitzecbzc.github.io/wp-content/uploads/2019/03/zcash-icon-fullcolor.png")
            .addFields([
                {name: "In Block", value: (in_block > 0 ? `${in_block}` : "Not mined yet"), inline: true},
                {name: "Confirmations", value: (in_block > 0 ? `${(best_height - in_block)+1}` : "In mempool"), inline: true},
                {name: "Fee", value: (`${parseInt(fee) / 10**8} ZEC`), inline: false},
            ])
            .addFields([
                {name: "Inputs", value: `${trimInput.join('\n')}`, inline: true},
                {name: "Outputs", value: `${trimOutput.join('\n')}`, inline: true},
            ])
            .setTimestamp()
            .setFooter({text: "Data provided by 3xpl.com", iconURL: "https://3xpl.com/assets/images/favicons/32.png"})

            await i.reply({embeds: [txEmbed]});
        }).catch(err => console.log(err));

    }
    
    else if(cmd[0].toLowerCase() == '$zpool' || cmd[0].toLowerCase() == '$zpools' || cmd[0].toLowerCase() == '$poolz') {
        await i.channel.sendTyping();
        let blockchainInfo;
        try {
            blockchainInfo = await axios.get('https://mainnet.zcashexplorer.app/api/v1/blockchain-info');
        } catch(err) {
            interaction.editReply('ZcashBlockExplorer API is unavaiable.\n' + err);
            return;
        }
        // console.log(blockchainInfo.data)
        
        await i.reply({embeds: [{                
            title: '<:zcash:1060629265961472080> Chain Value Pool Info',
            color: 0xf4b728,
            description: `Check Zcash $ZEC supply in each value pool.`,
            fields: [
                // {name: 'Total Supply', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                // {name: 'Transparent', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[0].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                {name: 'Sprout', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[1].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                {name: 'Sapling', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[2].chainValue.toLocaleString('en-US')} ZEC**`, inline: true},
                {name: 'Orchard', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[3].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},                
                {name: 'Lockbox', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[4].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},                
            ],
            footer: {text: 'Data provided by ZcashBlockExplorer API'},
            timestamp: new Date()
        }]});
    }
    else if(cmd[0].toLocaleLowerCase() == '$zrange') {
        if(txSummaryLock) {
            await i.reply('Hold on until I finish a previous call to this command!');
            return;
        }        

        const latestBlock = await grpc.getLatestBlock(lc);        
        
        let start = parseInt(latestBlock.height) - 1152;
        let end = parseInt(latestBlock.height);
      

        // if(isNaN(cmd[1])) {
        //     // await i.reply('Please inform a valid range');
        //     // return;
        //     start = parseInt(latestBlock.height - 1152)
        // } else {
        //     start = parseInt(latestBlock.height - parseInt(cmd[1]));
        // }  
        if(cmd[1])       {
            start=2490000;
            end=2550000;
        }

        // if(end - start > SYNC_PERIOD*4) {
        //     await i.reply(`Range too large, please try again with a smaller range. ${SYNC_PERIOD*4} blocks or less`);
        //     return;
        // }

        txSummaryLock = true;
        const data = await syncTransactions(start, end, false);
        const dataChart = {
            sapling: data.sapling,
            orchard: data.orchard,
            start: start,
            end: end
        }
                
        const [chart, uuid] = await createShieldedChart(dataChart);

        const attach = new AttachmentBuilder(chart, {name: uuid+'.png'});

        txSummaryLock = false;

        // return;
        const zcashEmbed = new EmbedBuilder()
            .setTitle('<:zcash:1060629265961472080> Shielded Transaction Info')
            .setColor(0xf4b728)
            // .setDescription()
            .setImage('attachment://'+uuid+'.png')

        await i.channel.send({embeds: [zcashEmbed], files: [attach]})
    }

    else if(cmd[0].toLocaleLowerCase() == '$z') {
        if(txSummaryLock || dbSyncLock) {
            await i.reply('Already processing or database not synched yet.');
            return;
        }        

        // if(isNaN(cmd[1]) || isNaN(cmd[2])) {
        //     await i.reply('Please inform a valid range');
        //     return;
        // }                 

        // const start = parseInt(cmd[1]);
        // const end = parseInt(cmd[2]);

        // if(end - start > SYNC_PERIOD*4) {
        //     await i.reply(`Range too large, please try again with a smaller range. ${SYNC_PERIOD*4} blocks or less`);
        //     return;
        // }

        let filter = false;
        if(cmd[1] && cmd[1].toLowerCase() == 'filter') filter = true;

        txSummaryLock = true;
        
        const dataChart = {
            sapling: [],
            orchard: []
        }
        let totalTx = 0;
        let saplingTx = 0;
        let saplingTxFilter = 0;
        let orchardTx = 0;
        let orchardTxFilter = 0;

        const privacySetModel = sequelize.models.privacyset;
        try {
            const allTx = await privacySetModel.findAll({
                where: {
                    height:{
                        [Op.lte]: 2619266
                    }
                }
            });
            if(allTx) {
                
                totalTx = allTx.reduce((acc, curr) => curr.dataValues.transactions + acc, 0);
                                
                allTx.forEach((entry) => {
                    saplingTx += entry.sapling;
                    saplingTxFilter += entry.sapling_filter;
                    orchardTx += entry.orchard;
                    orchardTxFilter += entry.orchard_filter;
                    if(entry.height % (SYNC_PERIOD * 90) == 0) {
                        dataChart.sapling.push({
                            height: entry.height,
                            sum: saplingTx,
                            sum_filter: saplingTxFilter
                        });
                        
                        dataChart.orchard.push({
                            height: entry.height,
                            sum: orchardTx,
                            sum_filter: orchardTxFilter
                        });
                    }
                });                
            }
        } catch(e) {
            console.log(e);
        }
        
        const [chart, uuid] = await createShieldedAreaChart(dataChart, filter);

        const attach = new AttachmentBuilder(chart, {name: uuid+'.png'});

        txSummaryLock = false;

        // return;
        const zcashEmbed = new EmbedBuilder()
            .setTitle('<:zcash:1060629265961472080> Shielded Transaction Info')
            .setColor(0xf4b728)
            .addFields([
                {name: "Total number of transactions", value: `${totalTx}`, inline: false},                
            ])
            .addFields([
                {name: "Sapling transactions", value: `${saplingTx}`, inline: false},                
                {name: "Sapling transactions (filtered)", value: `${saplingTxFilter}`, inline: true},                
            ])
            .addFields([
                {name: "Orchard transactions", value: `${orchardTx}`, inline: false},                
                {name: "Orchard transactions (filtered)", value: `${orchardTxFilter}`, inline: true},                
            ])
            // .setDescription()
            .setImage('attachment://'+uuid+'.png')

        await i.channel.send({embeds: [zcashEmbed], files: [attach]})
    }

    else if(cmd[0].toLocaleLowerCase() == '$zummary') {
        if(txSummaryLock || dbSyncLock) {
            await i.reply('Already processing or database not synched yet.');
            return;
        }        

        // if(isNaN(cmd[1]) || isNaN(cmd[2])) {
        //     await i.reply('Please inform a valid range');
        //     return;
        // }                 

        // const start = parseInt(cmd[1]);
        // const end = parseInt(cmd[2]);

        // if(end - start > SYNC_PERIOD*4) {
        //     await i.reply(`Range too large, please try again with a smaller range. ${SYNC_PERIOD*4} blocks or less`);
        //     return;
        // }

        let filter = false;
        if(cmd[1] && cmd[1].toLowerCase() == 'filter') filter = true;

        txSummaryLock = true;
        
        const dataChart = {
            sapling: [],
            orchard: []
        }
        let totalTx = 0;
        let saplingTx = 0;
        let saplingTxFilter = 0;
        let orchardTx = 0;
        let orchardTxFilter = 0;

        const privacySetModel = sequelize.models.privacyset;
        try {
            const allTx = await privacySetModel.findAll();
            if(allTx) {
                
                totalTx = allTx.reduce((acc, curr) => curr.dataValues.transactions + acc, 0);
                                
                allTx.forEach((entry) => {
                    saplingTx += entry.sapling;
                    saplingTxFilter += entry.sapling_filter;
                    orchardTx += entry.orchard;
                    orchardTxFilter += entry.orchard_filter;
                    if(entry.height % (SYNC_PERIOD * 90) == 0) {
                        dataChart.sapling.push({
                            height: entry.height,
                            sum: saplingTx,
                            sum_filter: saplingTx - saplingTxFilter
                        });
                        
                        dataChart.orchard.push({
                            height: entry.height,
                            sum: orchardTx,
                            sum_filter: orchardTx - orchardTxFilter
                        });

                    saplingTx = 0;
                    saplingTxFilter = 0;
                    orchardTx = 0;
                    orchardTxFilter = 0;
                    }
                });                
            }
        } catch(e) {
            console.log(e);
        }
        
        const [chart, uuid] = await createShieldedBarChart(dataChart, filter);

        const attach = new AttachmentBuilder(chart, {name: uuid+'.png'});

        txSummaryLock = false;

        // return;
        const zcashEmbed = new EmbedBuilder()
            .setTitle('<:zcash:1060629265961472080> Shielded Transaction Info')
            .setColor(0xf4b728)
            // .addFields([
            //     {name: "Total number of transactions", value: `${totalTx}`, inline: false},                
            // ])
            // .addFields([
            //     {name: "Sapling transactions", value: `${saplingTx}`, inline: false},                
            //     {name: "Sapling transactions (filtered)", value: `${saplingTxFilter}`, inline: true},                
            // ])
            // .addFields([
            //     {name: "Orchard transactions", value: `${orchardTx}`, inline: false},                
            //     {name: "Orchard transactions (filtered)", value: `${orchardTxFilter}`, inline: true},                
            // ])
            // .setDescription()
            .setImage('attachment://'+uuid+'.png')

        await i.channel.send({embeds: [zcashEmbed], files: [attach]})
    }
});

// async function getTransactionInfo(txid) {    
//     const rawTx = await grpc.getTransaction(lc, txid);
//     const txData = native.getTransactionData(Buffer.from(rawTx.data, 'hex').toString('hex'));
//     const txJson = JSON.parse(txData);
// }

async function createShieldedChart(dataC) {
    console.log(dataC)
    const data = {
        labels: ['Sapling', 'Orchard'],
        datasets: [
          {
            label: 'Shielded Transactions',
            data: [dataC.sapling, dataC.orchard],
            backgroundColor: ['#00640a', '#5970ad'],
          }
        ]
      };
    
    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            
                title: {
                    display: true,
                    text: 'Shielded Transactions'
                },     
                subtitle: {
                    display: true,
                    text: `From block ${dataC.start} to ${dataC.end}`
                },
                datalabels: {
                    color: '#fff',  // Text color
                    anchor: 'center',  // Position inside the doughnut segment
                    align: 'center',  // Center the text
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(2) + "%";
                        return `${value}\n(${percentage})`;  // Display both value and percentage
                    },
                    font: {
                        weight: 'bold',
                        size: 16
                    }
                }                  
            }
        },
        plugins: [ChartDataLabels]

    };
    
    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    const uuid = uuidv4();
    return [buffer, uuid];
}

async function createShieldedAreaChart(dataC, filter) {
    // console.log(dataC)
    const mSapling = dataC.sapling.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum;
        return m
    });
    const mOrchard = dataC.orchard.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum > 0 ? el.sum : null;
        return m
    });
    const mSaplingF = dataC.sapling.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum_filter;
        return m
    });
    const mOrchardF = dataC.orchard.map(el => {
        
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum_filter > 0 ? el.sum_filter : null;;
        return m
    });

    const sets = [];
    if(filter) {
        sets.push({
            label: 'Orchard transactions (Spam filtered)',
            data: mOrchardF,
            borderColor: '#9fd3e9',
            backgroundColor: '#9fd3e9aa',
            fill: 'start', 
            pointRadius: 1,
            borderWidth: 2
        })
    }
    sets.push({
        label: 'Orchard transactions',
        data: mOrchard,
        borderColor: '#5970ad',
        backgroundColor: '#5970adaa',
        fill: 'start',
        pointRadius: 1,
        borderWidth: 2
    });

    if(filter) {
        sets.push({
            label: 'Sapling transactions (Spam filtered)',
            data: mSaplingF,
            borderColor: '#12826c',
            backgroundColor: '#12826caa',
            fill: 'start',
            pointRadius: 1,
            borderWidth: 2
        });
    }

    sets.push({
        label: 'Sapling transactions',
        data: mSapling,
        borderColor: '#00640a',
        backgroundColor: '#00640aaa',
        fill: 'start',
        pointRadius: 1,
        borderWidth: 2
    });
    
    const data = {
        labels: mSapling.x,
        datasets: sets
    }
    
    const chartConfig = {
        type: 'line',
        data: data,
        options: {
            plugins: {
            filler: {
                propagate: false,
            },
            title: {
                display: true,
                text: 'Zcash Shielded Transactions'
            }
            },
            interaction: {
                intersect: false,
            }
        }
    }
    const buffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
    const uuid = uuidv4();
    return [buffer, uuid];
}

async function createShieldedBarChart(dataC, filter) {
    // console.log(dataC)
    const mSapling = dataC.sapling.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum;
        return m
    });
    const mOrchard = dataC.orchard.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum > 0 ? el.sum : null;
        return m
    });
    const mSaplingF = dataC.sapling.map(el => {
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum_filter;
        return m
    });
    const mOrchardF = dataC.orchard.map(el => {
        
        let m = {};
        m.x = `${el.height}`,
        m.y = el.sum_filter > 0 ? el.sum_filter : null;;
        return m
    });

    const sets = [];
    if(filter) {
        sets.push({
            label: 'Orchard transactions (Spam filtered)',
            data: mOrchardF,
            borderColor: '#9fd3e9',
            backgroundColor: '#9fd3e9aa',
            fill: 'start', 
            pointRadius: 1,
            borderWidth: 2
        })
    }
    sets.push({
        label: 'Orchard transactions',
        data: mOrchard,
        borderColor: '#5970ad',
        backgroundColor: '#5970adaa',
        fill: 'start',
        pointRadius: 1,
        borderWidth: 2
    });

    if(filter) {
        sets.push({
            label: 'Sapling transactions (Spam filtered)',
            data: mSaplingF,
            borderColor: '#12826c',
            backgroundColor: '#12826caa',
            fill: 'start',
            pointRadius: 1,
            borderWidth: 2
        });
    }

    sets.push({
        label: 'Sapling transactions',
        data: mSapling,
        borderColor: '#00640a',
        backgroundColor: '#00640aaa',
        fill: 'start',
        pointRadius: 1,
        borderWidth: 2
    });
    
    const data = {
        labels: mSapling.x,
        datasets: sets
    }
    
    const chartConfig = {
        type: 'bar',
        data: data,
        options: {
            plugins: {
            filler: {
                propagate: false,
            },
            title: {
                display: true,
                text: 'Zcash Shielded Transactions'
            }
            },
            interaction: {
                intersect: false,
            },
            scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true
                }
            }
        }
    }
    const buffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
    const uuid = uuidv4();
    return [buffer, uuid];
}

async function initDb() {    
    const latestBlock = await grpc.getLatestBlock(lc);
    // const latestBlock = {height: 1155040};    

    // Get latest synched height from db
    const privacySetModel = sequelize.models.privacyset;
    try {
        const dbHeight = await privacySetModel.findOne({
            order: [['height', 'DESC']] // Order by height in descending order
        });

        if (dbHeight) {
            const lastDbHeight = dbHeight.dataValues.height;
      
            if(latestBlock.height - lastDbHeight > SYNC_PERIOD) {                
                // Skip 1 block to avoid double processing previously synched block
                syncTransactions(lastDbHeight + 1, latestBlock.height, true);
            }
            else {
                console.log('Database is up to date');
            }
        } else {
            console.log('No transactions found. Synching from SAPLING_ACTIVATION');
            syncTransactions(SAPLING_ACTIVATION, latestBlock.height, true);
        }
    } catch (error) {
        console.error('Error finding latest transaction:', error);
    }

    // Register a interval to fetch new transactions
    setInterval(async() => {
        if(dbSyncLock) {
            return;
        }

        const privacySetModel = sequelize.models.privacyset;
        const latestBlock = await grpc.getLatestBlock(lc);        
        try {
            const dbHeight = await privacySetModel.findOne({
                order: [['height', 'DESC']] // Order by height in descending order
            });

            const lastDbHeight = dbHeight.dataValues.height;

            if(latestBlock.height - lastDbHeight > SYNC_PERIOD) {                
                console.log("Updating database");
                syncTransactions(lastDbHeight, latestBlock.height, true);
            }
            else {
                console.log("No need to update db yet ...");
            }
        } catch(e) {
            console.log(e);
        }


    }, 60 * 60 * 1000);
}

async function syncTransactions(start, end, writeDb) {        
    dbSyncLock = true;
    
    let startHeight = start;
    const endHeight = end;
  
    let blocksProcessed = 0;
    let actionsProcessed = 0;
    let spendsProcessed = 0;
    let outputsProcessed = 0;
    let txProcessed = 0;
    let txProcessedFilter = 0;
    let saplingTx = 0;
    let orchardTx = 0;
    let saplingTxFilter = 0;
    let orchardTxFilter = 0;

    spamFilterLimit = 50;
    const batchSize = 2000;
    let latestSynced = startHeight;

    const privacySetModel = sequelize.models.privacyset;
    // if(writeDb) {                
    //     // Set values to previous recorded values (cummulative)
    //     try{
    //         const dbHeight = await privacySetModel.findOne({
    //             where: {'height': startHeight}
    //         });

    //         txProcessed = dbHeight.dataValues.transactions;
    //         txProcessedFilter = dbHeight.dataValues.transactions_filter;
    //         saplingTx = dbHeight.dataValues.sapling;
    //         orchardTx = dbHeight.dataValues.orchard;
    //         saplingTxFilter = dbHeight.dataValues.sapling_filter;
    //         orchardTxFilter = dbHeight.dataValues.orchard_filter;
    //     } catch(e) {
    //         console.log(e);
    //     }
    //     // And skip 1 block
    //     latestSynced += 1;
    // }
    
    console.log(`Downloading blocks. start: ${startHeight}, end: ${endHeight}. Batch Size: ${batchSize}`);
    
    while(latestSynced <= endHeight) {
        const chunk = Math.min(latestSynced + batchSize, endHeight);
        try {
            const blocks = await grpc.getBlockRange(latestSynced, chunk);                
            
            for(const block of blocks) {                          
                for(const vtx of block.vtx) {                                                    
                    let isSpam = false;
                    let txCount = 0;
                    if(vtx.actions.length > spamFilterLimit || vtx.outputs.length > spamFilterLimit) {
                        // console.log(`Transaction is spam ...`);
                        isSpam = true;
                    } 

                    if(block.height >= ORCHARD_ACTIVATION) {
                        if(vtx.actions.length > 0) {
                            actionsProcessed += vtx.actions.length;
                            orchardTx += 1;
                            if(!isSpam) orchardTxFilter += 1;
                            txCount += 0.5;
                        }
                    }

                    if(vtx.outputs.length > 0 || vtx.spends.length > 0) {
                        outputsProcessed += vtx.outputs.length;                            
                        saplingTx += 1
                        if(!isSpam) saplingTxFilter += 1;
                        txCount += 0.5;
                    }
                    
                    spendsProcessed += vtx.spends.length;         

                    txProcessed += Math.ceil(txCount);
                    if(!isSpam) txProcessedFilter += Math.ceil(txCount);                   
                }

                // Save sum of transactions to database
                if(block.height % SYNC_PERIOD == 0 && writeDb) {
                    // console.log(`Daily report tx total ${txProcessed} transactions\n`)
                    try {                        
                        await privacySetModel.create({
                            height: block.height,
                            sapling: saplingTx,
                            sapling_filter: saplingTxFilter,
                            orchard: orchardTx,
                            orchard_filter: orchardTxFilter,
                            transactions: txProcessed,
                            transactions_filter: txProcessedFilter
                        });
                    } catch(e) {
                        console.log(e)
                    }     
                    txProcessed = 0;
                    txProcessedFilter = 0;
                    saplingTx = 0;
                    orchardTx = 0;
                    saplingTxFilter = 0;
                    orchardTxFilter = 0;           
                }
            }

            blocksProcessed += blocks.length;
            latestSynced = chunk + 1;
        }
        catch(e) {
            console.log(e);
            throw(e);
        }                   
    }  

    dbSyncLock = false;

    console.log(`Processed a total of ${blocksProcessed} blocks`); 
    console.log(`Total transactions processed: ${txProcessed}\n`);
    console.log(`Total transactions processed: ${txProcessed}\n` +
            `Total filtered transactions processed: ${txProcessedFilter}\n` +
            `Total sapling transactions processed: ${saplingTx}\n` +
            `Total orchard transactions processed: ${orchardTx}\n` +
            `Total filtered sapling transactions processed: ${saplingTxFilter}\n` +
            `Total filtered orchard transactions processed: ${orchardTxFilter}\n` +
            `Total orchard actions processed: ${actionsProcessed}\n` +
            `Total sapling spends processed: ${spendsProcessed}\n` +
            `Total sapling outputs processed: ${outputsProcessed}`);
    // );

    return {
        sapling: saplingTx,
        sapling_filter: saplingTxFilter,
        orchard: orchardTx,
        orchard_filter: orchardTxFilter,
        transactions: txProcessed,
        transactions_filter: txProcessedFilter
    }
}

client.login(process.env.DISCORD_TOKEN);