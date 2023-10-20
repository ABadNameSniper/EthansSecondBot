const EventEmitter = require('events');

const msgUpdateEmitter = new EventEmitter();

module.exports = {
    name: 'messageUpdate',
    emitter: msgUpdateEmitter,
    async execute(oldmsg, newmsg, client) {
        //bad relay system so i don't have to do anything with weird functions and stuff.
        //i want to take advantage of the scope of togglehyperchats but i don't want to rewrite events system. I think this works.
        //maybe it would be better to ignore second comment and just do client.on('messageUpdate')
        if (oldmsg?.author?.bot) return; //ignore bots
        msgUpdateEmitter.emit("messageUpdate", oldmsg, newmsg, client);
    }
}