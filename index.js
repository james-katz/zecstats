const { Client, GatewayIntentBits, ModalSubmitInteraction, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const CoinGecko = require('coingecko-api');
const axios = require('axios');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const { v4: uuidv4 } = require('uuid');

const dotenv = require('dotenv');
const coingeckoApi = require('coingecko-api');

dotenv.config();
const CoinGeckoClient = new CoinGecko();
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 1000, height: 600, backgroundColour: '#2f3136'});

const client = new Client({
    intents: [
       GatewayIntentBits.Guilds,
       GatewayIntentBits.GuildMessages,   
       GatewayIntentBits.MessageContent
   ],
});
console.log("Booting...");

client.once('ready', () => {
    console.log("Ready!");    
});

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
            blockchainInfo = await axios.get('http://185.62.57.21:4001/api/v1/blockchain-info');
        } catch(err) {
            interaction.editReply('ZcashBlockExplorer API is unavaiable.\n' + err);
            return;
        }
        // console.log(blockchainInfo.data.valuePools)
        await i.reply({embeds: [{                
            title: '<:zcash:1060629265961472080> Chain Value Pool Info',
            color: 0xf4b728,
            description: `Check Zcash $ZEC supply in each value pool.`,
            fields: [
                {name: 'Total Supply', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.chainSupply.chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                {name: 'Transparent', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[0].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                {name: 'Sprout', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[1].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},
                {name: 'Sapling', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[2].chainValue.toLocaleString('en-US')} ZEC**`, inline: true},
                {name: 'Orchard', value: `<:zcash:1060629265961472080> **${blockchainInfo.data.valuePools[3].chainValue.toLocaleString('en-US')} ZEC**`, inline: false},                
            ],
            footer: {text: 'Data provided by ZcashBlockExplorer API'},
            timestamp: new Date()
        }]});

    }
})
client.login(process.env.DISCORD_TOKEN);