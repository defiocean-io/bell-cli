import fs from 'fs';
import chalk from 'chalk';
import axios from 'axios';
import prompt from 'prompt';
import BigNumber from 'bignumber.js';
import { exec } from 'child_process';

const timelog = (message) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

const bootstrap = async() => {
    let logged = false;

    let storage = await new Promise((resolve) => {
        fs.readFile('storage.json', {}, (err, data) => {
            if (err) {
                fs.writeFile('storage.json', JSON.stringify({ token: '' }), {}, (err) => {
                    if (err) throw new Error('Error with create storage.json');
    
                    else {
                        resolve({token: '' });
                    }
                });
            }

            if (data){
                resolve(JSON.parse(data.toString()));
            }
        });
    });

    exec(`termux-wake-lock`, (error, stdout, stderr) => {
        if (error) {
            timelog(`Wake-lobck command Failed: ${error.message}`);
            return;
        }
        timelog(`Wake-lock [UP] ${stdout}`);
    });

    while (true){
        if (!storage.token){
            timelog(`${chalk.cyan('[>]')} ${chalk.blue('Bell-Cli')} key login`);
            prompt.start();

            const cliprompt = await prompt.get('cli_key');
            await axios.get('http://bell.defiocean.io/api/user/me', { params: { token: cliprompt.cli_key } }).then((response) => {
                storage.token = cliprompt.cli_key;

                fs.writeFile('storage.json', JSON.stringify(storage), {}, (err) => {
                    if (err) throw new Error('Update storage.json failed');
                });
            }).catch(() => {
                timelog(`${chalk.red(`Authorization failed`)}`);
            });

            continue;
        }

        await axios.get('http://bell.defiocean.io/api/user/me', { params: { token: storage.token }}).then((response) => {
            if (!logged){
                logged = true;
                timelog(`${chalk.green(`Logged as: ${response.data.name}`)}`);
            }

            const user = response.data;

            user.alerts.forEach((alert) => {
                if (alert.active && alert.targetMod === 'lesser' && new BigNumber(alert.currentValue).lt(alert.targetValue)){
                    timelog(`${alert.targetSymbol} price: ${alert.currentValue}$ lesser than target ${alert.targetValue}$`);
                    exec(`termux-vibrate -d 3000`, (error, stdout, stderr) => {
                        if (error) {
                            timelog(`Command Failed: ${error.message}`);
                            return;
                        }
                        timelog(`Command executed ${stdout}`);
                    });
                }
                else if (alert.active && alert.targetMod === 'greater' && new BigNumber(alert.currentValue).gt(alert.targetValue)){
                    timelog(`${alert.targetSymbol} price: ${alert.currentValue}$ greater than target ${alert.targetValue}$`);
                    exec(`termux-vibrate -d 3000`, (error, stdout, stderr) => {
                        if (error) {
                            timelog(`Command Failed: ${error.message}`);
                            return;
                        }
                        timelog(`Command executed ${stdout}`);
                    });
                };
            });
        
        }).catch((err) => {
            timelog(`Request to bell services failed: ${err?.response?.data ? JSON.stringify(err?.response?.data) : err.message}`);
        })

        await new Promise(r => setTimeout(r, 1000));
    }
};

bootstrap();