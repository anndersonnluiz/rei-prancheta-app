const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clubes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'clubes.json'), 'utf8'));
const clubByKey = new Map(clubes.map(c => [norm(c.nome), c]));
const aliases = new Map([
  ['atleticoparanaense', 'Athletico-PR'],
  ['athleticoparanaense', 'Athletico-PR'],
  ['rbbragantino', 'Red Bull Bragantino'],
  ['redbullbragantino', 'Red Bull Bragantino'],
  ['atleticogoianiense', 'Atlético-GO'],
  ['botafogodesp', 'Botafogo-SP'],
  ['botafogosp', 'Botafogo-SP'],
  ['saobernardo', 'São Bernardo'],
  ['america mg', 'América-MG'],
  ['operario', 'Operário-PR'],
  ['botafogodapb', 'Botafogo-PB'],
  ['botafogopb', 'Botafogo-PB'],
  ['brusque', 'Brusque'],
  ['ferroviaria', 'Ferroviária'],
  ['maringafc', 'Maringá'],
  ['maringa', 'Maringá'],
  ['paysandu yfc', 'Paysandu'],
  ['paysanduyfc', 'Paysandu'],
  ['paysandu', 'Paysandu'],
  ['santacruzfc', 'Santa Cruz'],
  ['santacruz', 'Santa Cruz'],
  ['ypiranga', 'Ypiranga-RS'],
  ['ypirangars', 'Ypiranga-RS'],
  ['maranhaoac', 'Maranhão'],
  ['maranhao', 'Maranhão'],
  ['amazonasfc', 'Amazonas'],
  ['caxiassul', 'Caxias'],
  ['caxiadosul', 'Caxias'],
  ['guaranifc', 'Guarani'],
  ['barrasc', 'Barra-SC'],
  ['barrasc', 'Barra-SC'],
  ['barrafc', 'Barra-SC'],
  ['anapolisfc', 'Anápolis'],
  ['confianca', 'Confiança'],
  ['cuiaba', 'Cuiabá'],
  ['gremio', 'Grêmio'],
  ['avai', 'Avaí']
]);
const positions = new Map([
  ['Goleiro','GOL'],['Zagueiro','ZAG'],['Lateral Esq.','LAT'],['Lateral Dir.','LAT'],
  ['Volante','VOL'],['Meia Central','MEI'],['Meia Direita','MEI'],['Meia Ofensivo','MEI'],
  ['Ponta Esquerda','ATA'],['Ponta Direita','ATA'],['Seg. Atacante','ATA'],['Centroavante','ATA'],['Atacante','ATA']
]);
function norm(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function clean(v) {
  return String(v || '')
    .replace(/&#x20;/gi, ' ')
    .replace(/&#x9;/gi, '\t')
    .replace(/\\-/g, '-')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}
function parse(file) {
  const lines = fs.readFileSync(file,'utf8').replace(/\r/g,'').split('\n').map(clean);
  const records=[]; let club=null;
  for(let i=0;i<lines.length;i++) {
    const raw=lines[i].trim(); const key=norm(raw);
    const clubKey = key === 'caxiadosul' ? 'caxias' : (aliases.get(key) ? norm(aliases.get(key)) : key);
    if (clubByKey.has(clubKey) && !positions.has(raw) && (!lines[i-1] || !lines[i-1].trim())) {
      club=clubByKey.get(clubKey); continue;
    }
    if (!positions.has(raw) || !club) continue;
    const nameLine = lines[i-1]?.trim();
    const name = (nameLine || '').split('\t').map(v => v.trim()).filter(Boolean)[0];
    if (!name || name.length > 70 || clubByKey.has(norm(name))) continue;
    let age=null, value=null;
    for(let j=i+1;j<Math.min(i+8,lines.length);j++) {
      const m=lines[j].match(/\((\d{2})\)/); if(m) age=Number(m[1]);
      const v=lines[j].match(/€\s*([\d.,]+)\s*(mi\.|mil)?/i);
      if(v) value=v[2]?.toLowerCase().startsWith('mi') ? Number(v[1].replace(',','.'))*1e6 : Number(v[1].replace(',','.'))*1e3;
      if(age!==null && value!==null) break;
    }
    records.push({clubId:club.id,club:club.nome,divisao:club.divisao,nome:name,posicao:positions.get(raw),idade:age,valorMercado:value});
  }
  return records;
}
const files=process.argv.slice(2).filter(arg => !arg.startsWith('--')); const all=files.flatMap(parse);
const byClub=new Map(); all.forEach(r=>byClub.set(r.club,(byClub.get(r.club)||0)+1));
console.log(JSON.stringify({records:all.length,clubs:byClub.size,byClub:Object.fromEntries(byClub)},null,2));
if(process.argv.includes('--write')) {
  const file=path.join(root,'data','elencos_fontes_2026.json');
  fs.writeFileSync(file,JSON.stringify(all,null,2)+'\n');
  console.log(`Arquivo estruturado criado: ${file}`);
}
