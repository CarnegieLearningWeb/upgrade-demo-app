module.exports = [
    {
        name: "square",
        message: {
            description: "A square has a side length of 10 inches.",
            question: "What is the area of the square?"
        },
        drawing:
            `
            <rect x="75" y="-25" width="150" height="150" style="fill:none;" />
            <image class="concrete" href="/asset/image/napkin.svg" x="76" y="-24" width="148" height="148" />
            <text x="48" y="56">10 in.</text>
            <text x="140" y="138">10 in.</text>
            `,
        correctAnswer: "100"
    },
    {
        name: "rectangle",
        message: {
            description: "A rectangle has a length of 50 inches and a width of 30 inches.",
            question: "What is the area of the rectangle?"
        },
        drawing:
            `
            <rect x="30" y="-20" width="240" height="144" style="fill:none;" />
            <image class="concrete" href="/asset/image/television.svg" x="31" y="-19" width="238" height="142" />
            <text x="0" y="56">30 in.</text>
            <text x="140" y="138">50 in.</text>
            `,
        correctAnswer: "1500"
    },
    {
        name: "triangle",
        message: {
            description: "A triangle is 14 inches long and has a 5 inch base.",
            question: "What is the area of the triangle?"
        },
        drawing:
            `
            <polygon points="20,0 300,50 20,100" style="fill:none;" />
            <polygon id="banner" class="concrete" points="22,2 293,50 22,98" style="stroke:none" />
            <image class="concrete" href="/asset/image/college-logo.svg" x="30" y="27" width="39" height="46" />
            <text id="brown-text" class="concrete" x="76" y="60">BROWN</text>
            <line x1="20" y1="110" x2="299" y2="110" />
            <line x1="20" y1="105" x2="20" y2="115" />
            <line x1="299" y1="105" x2="299" y2="115" />
            <text x="0" y="56">5 in.</text>
            <text x="140" y="124">14 in.</text>
            `,
        correctAnswer: "35"
    }
];