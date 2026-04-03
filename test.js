const API_KEY = "AIzaSyCbO9rg06monO_rS4x_B1gqaY4dKfE58vw";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function test() {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "hi" }] }]
        })
    });
    console.log(res.status, await res.text());
}
test();
