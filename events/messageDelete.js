const EventEmitter = require('events');

const msgUpdateEmitter = new EventEmitter();

module.exports = {
    name: 'messageDelete',
    emitter: msgUpdateEmitter,
    async execute(oldmsg, client) {
        //bad relay system so i don't have to do anything with weird functions and stuff.
        //i want to take advantage of the scope of togglehyperchats but i don't want to rewrite events system.
        //I think this works.
        //maybe it would be better to ignore second comment and just do client.on('messageUpdate')
        msgUpdateEmitter.emit("messageDelete", oldmsg, null, client);
    }
}