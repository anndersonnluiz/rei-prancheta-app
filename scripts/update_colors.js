const fs = require('fs');

const clubsDataPath = 'd:/Projetos/rei-prancheta-app/data/clubes.json';
const clubs = JSON.parse(fs.readFileSync(clubsDataPath, 'utf8'));

const colorMap = {
    'Flamengo': ['#c62828', '#000000'],
    'Palmeiras': ['#2e7d32', '#ffffff'],
    'São Paulo': ['#c62828', '#ffffff'], // Tricolor
    'Corinthians': ['#000000', '#ffffff'],
    'Atlético-MG': ['#000000', '#ffffff'],
    'Fluminense': ['#881c1c', '#146b3a'], // Grená e Verde
    'Grêmio': ['#0d47a1', '#000000'], // Tricolor
    'Internacional': ['#d32f2f', '#ffffff'],
    'Cruzeiro': ['#1565c0', '#ffffff'],
    'Botafogo': ['#000000', '#ffffff'],
    'Athletico-PR': ['#d32f2f', '#000000'],
    'Vasco': ['#000000', '#ffffff'],
    'Bahia': ['#1565c0', '#c62828'], // Tricolor
    'Fortaleza': ['#1565c0', '#c62828'], // Tricolor
    'Ceará': ['#000000', '#ffffff'],
    'Goiás': ['#2e7d32', '#ffffff'],
    'Coritiba': ['#2e7d32', '#ffffff'],
    'Santos': ['#ffffff', '#000000'],
    'Sport': ['#c62828', '#000000'],
    'Vitória': ['#c62828', '#000000'],
    'América-MG': ['#2e7d32', '#000000'],
    'Atlético-GO': ['#c62828', '#000000'],
    'Juventude': ['#2e7d32', '#ffffff'],
    'Criciúma': ['#fbc02d', '#000000'], // Amarelo e Preto
    'Ponte Preta': ['#000000', '#ffffff'],
    'Guarani': ['#2e7d32', '#ffffff'],
    'Vila Nova': ['#c62828', '#ffffff'],
    'CRB': ['#c62828', '#ffffff'],
    'Chapecoense': ['#2e7d32', '#ffffff'],
    'Avaí': ['#1565c0', '#ffffff'],
    'Novorizontino': ['#fbc02d', '#000000'],
    'Mirassol': ['#fbc02d', '#2e7d32'],
    'Tombense': ['#d32f2f', '#ffffff'],
    'Sampaio Corrêa': ['#fbc02d', '#2e7d32'], // Bolivão
    'Ituano': ['#d32f2f', '#000000'],
    'Botafogo-SP': ['#d32f2f', '#ffffff'], // Tricolor
    'ABC': ['#000000', '#ffffff'],
    'Londrina': ['#0288d1', '#ffffff'],
    'Operário-PR': ['#000000', '#ffffff'],
    'Figueirense': ['#000000', '#ffffff'],
    'Paysandu': ['#0288d1', '#ffffff'],
    'Remo': ['#0d47a1', '#ffffff'],
    'Náutico': ['#c62828', '#ffffff'],
    'Santa Cruz': ['#c62828', '#000000'], // Tricolor
    'Paraná': ['#c62828', '#0288d1'],
    'Caxias': ['#881c1c', '#000000'],
    'Joinville': ['#d32f2f', '#000000'],
    'CSA': ['#0288d1', '#ffffff'],
    'Brusque': ['#fbc02d', '#d32f2f'],
    'Volta Redonda': ['#fbc02d', '#000000'],
    'São Bernardo': ['#fbc02d', '#000000'],
    'Ypiranga-RS': ['#fbc02d', '#2e7d32'],
    'Botafogo-PB': ['#000000', '#ffffff'],
    'Confiança': ['#0d47a1', '#ffffff'],
    'Floresta': ['#2e7d32', '#ffffff'],
    'Aparecidense': ['#1565c0', '#000000'],
    'Altos': ['#2e7d32', '#ffffff'],
    'Manaus': ['#2e7d32', '#ffffff'],
    'Amazonas': ['#fbc02d', '#000000'],
    'Ferroviária': ['#881c1c', '#ffffff'],
    'Caldense': ['#2e7d32', '#ffffff'],
    'Campinense': ['#d32f2f', '#000000'],
    'Treze': ['#000000', '#ffffff'],
    'Brasil de Pelotas': ['#d32f2f', '#000000'],
    'Retrô': ['#fbc02d', '#000000'],
    'Moto Club': ['#d32f2f', '#000000'],
    'Tuna Luso': ['#2e7d32', '#ffffff'],
    'Bangu': ['#c62828', '#ffffff'],
    'Portuguesa-RJ': ['#c62828', '#2e7d32'],
    'Cianorte': ['#1565c0', '#ffffff'],
    'Sergipe': ['#c62828', '#ffffff'],
    'ASA': ['#000000', '#ffffff'],
    'Sousa': ['#2e7d32', '#ffffff'],
    'Nacional-AM': ['#1565c0', '#ffffff'],
    'Rio Branco-AC': ['#d32f2f', '#ffffff'],
    'Atlético-AC': ['#0288d1', '#ffffff'],
    'Inter de Limeira': ['#000000', '#ffffff'],
    'Santo André': ['#0d47a1', '#ffffff'],
    'XV de Piracicaba': ['#000000', '#ffffff']
};

clubs.forEach(club => {
    if (colorMap[club.nome]) {
        club.cores = colorMap[club.nome];
    } else {
        // Fallback genérico para times não mapeados
        const defaultColors = [
            ['#c62828', '#ffffff'],
            ['#2e7d32', '#ffffff'],
            ['#1565c0', '#ffffff'],
            ['#000000', '#ffffff']
        ];
        club.cores = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    }
});

fs.writeFileSync(clubsDataPath, JSON.stringify(clubs, null, 2), 'utf8');
console.log('Cores dos clubes atualizadas com sucesso!');
