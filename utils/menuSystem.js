const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, Message, ButtonStyle } = require('discord.js');

module.exports = {
    // SelectionType: class {I am glad I learned how to make enums,
    ////too bad i didn't end up using it
    //     static radio = 1;
    //     static check = 2;
    //     static dropdown = 3;
    // },
    Page: class {
        //maybe add an updateEmbedFunction argument?
        constructor(embed, /*rows = [navigationRow],*/ selections = [], firstOrLast = 0, selectionsButtonType=[]) {

            const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('<<<')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('<')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('>')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('>>>')
                    .setStyle(ButtonStyle.Primary)
            );

            this.embed = embed;
            this.selections = selections;
            let rows = [navigationRow]//i can probably rewrite the this.rows crap.
            switch(firstOrLast) {
                case 3:
                    rows = [];
                    break;
                case 1:
                    rows[0].components[0].disabled = true;
                    rows[0].components[1].disabled = true;
                    break;
                case 2:
                    rows[0].components[2].disabled = true;
                    rows[0].components[3].disabled = true;
            }

            let newRow = new ActionRowBuilder()
            for (let i = 0; i < selections.length; i++) {//idk if it evaluates every time
                newRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(selections[i])
                        .setLabel(selections[i])
                        .setStyle(selectionsButtonType[i] 
                            ? selectionsButtonType[i] 
                            : ButtonStyle.Primary)
                )
                if ((i+1)%5===0&&i!==0||i+1===selections.length) {
                    rows.push(newRow);
                    newRow = new ActionRowBuilder();
                }
            }
            this.rows = rows;//TODO: make custom error so i can make sure no more than 5 rows per page
        }
    },
    Menu: class {
        constructor(pages = [], starterPageNumber = 0) {
            this.pages = pages;
            this.currentPageNumber = starterPageNumber
        }
        send(interaction) {
            return interaction.reply(
                {embeds: [this.pages[this.currentPageNumber].embed], components: this.pages[this.currentPageNumber].rows, fetchReply: true}
            )
        }
        update(message) {//kinda useless? update: no
            message.update(
                {embeds: [this.pages[this.currentPageNumber].embed], components: this.pages[this.currentPageNumber].rows}
            );
        }
        async end(interaction) {
            for (let row of this.pages[this.currentPageNumber].rows) {
                for (let button of row.components) {
                    button.setDisabled(true);
                }
            }
            interaction.editReply(
                {embeds: [this.pages[this.currentPageNumber].embed], components: this.pages[this.currentPageNumber].rows}
            )
        }
    },
    sliceIntoChunks: function(arr, chunkSize) {
        const res = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            const chunk = arr.slice(i, i + chunkSize);
            res.push(chunk);
        }
        return res;
    }
}