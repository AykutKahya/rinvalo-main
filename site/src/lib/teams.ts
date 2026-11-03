import cupTeams from "../../data/cup-teams.json";

/**
 * Team registry. Every source spells clubs differently (football-data.co.uk "Man United",
 * TheSportsDB "Manchester United", openfootball "Manchester United FC"), so each team has one
 * slug and a list of aliases. Aliases are compared after `normalizeName`.
 *
 * Row: [slug, display name, short code, primary colour, secondary colour, ...aliases]
 */
type Row = [string, string, string, string, string, ...string[]];

const ROWS: Row[] = [
  // Süper Lig
  ["galatasaray", "Galatasaray", "GS", "#a90432", "#fdb912"],
  ["fenerbahce", "Fenerbahçe", "FB", "#0d1d4a", "#ffed00"],
  ["besiktas", "Beşiktaş", "BJK", "#111111", "#ffffff"],
  ["trabzonspor", "Trabzonspor", "TS", "#6d0a2b", "#62b5e5"],
  ["basaksehir", "Başakşehir", "İBFK", "#f26522", "#1d2a5c", "Buyuksehyr", "İstanbul Başakşehir", "Istanbul Basaksehir"],
  ["samsunspor", "Samsunspor", "SAM", "#e30613", "#ffffff"],
  ["goztepe", "Göztepe", "GÖZ", "#ffd200", "#c8102e", "Goztep"],
  ["kasimpasa", "Kasımpaşa", "KAS", "#0b2d6b", "#ffffff"],
  ["eyupspor", "Eyüpspor", "EYP", "#6a2c91", "#ffd100"],
  ["alanyaspor", "Alanyaspor", "ALN", "#f47920", "#00843d"],
  ["gaziantep", "Gaziantep FK", "GFK", "#d71920", "#111111", "Gaziantep"],
  ["konyaspor", "Konyaspor", "KON", "#00843d", "#ffffff"],
  ["rizespor", "Rizespor", "RİZ", "#0a7a3b", "#003da5", "Caykur Rizespor"],
  ["kocaelispor", "Kocaelispor", "KOC", "#006a3a", "#111111"],
  ["genclerbirligi", "Gençlerbirliği", "GB", "#c8102e", "#111111"],
  ["amed", "Amed SK", "AMD", "#009a44", "#d50032", "Amed", "Amedspor"],
  ["erzurumspor", "Erzurumspor", "ERZ", "#0055a4", "#ffffff", "Erzurum BB"],
  ["corum", "Çorum FK", "ÇOR", "#c8102e", "#ffffff", "Corum", "Çorum"],
  ["antalyaspor", "Antalyaspor", "ANT", "#e30613", "#ffffff"],
  ["kayserispor", "Kayserispor", "KAY", "#e2001a", "#ffd200"],
  ["karagumruk", "Karagümrük", "FKG", "#c8102e", "#111111", "Fatih Karagumruk"],
  ["sivasspor", "Sivasspor", "SİV", "#e30613", "#ffffff"],
  ["hatayspor", "Hatayspor", "HTY", "#7a1e3c", "#ffffff"],
  ["adana-demirspor", "Adana Demirspor", "ADS", "#0b4ea2", "#5ec4f0", "Ad. Demirspor"],
  ["ankaragucu", "Ankaragücü", "ANK", "#002f6c", "#ffd200", "Ankaragucu"],
  ["istanbulspor", "İstanbulspor", "İST", "#ffd200", "#111111", "Istanbulspor"],
  ["pendikspor", "Pendikspor", "PEN", "#e30613", "#ffffff"],
  ["bodrumspor", "Bodrum FK", "BOD", "#00843d", "#ffffff", "Bodrumspor"],
  ["giresunspor", "Giresunspor", "GİR", "#00843d", "#ffffff"],
  ["umraniyespor", "Ümraniyespor", "ÜMR", "#e30613", "#ffffff", "Umraniyespor"],
  ["altay", "Altay", "ALT", "#111111", "#ffffff"],
  ["yeni-malatyaspor", "Yeni Malatyaspor", "YMS", "#ffd200", "#111111"],
  // Premier League
  ["arsenal", "Arsenal", "ARS", "#ef0107", "#ffffff"],
  ["aston-villa", "Aston Villa", "AVL", "#670e36", "#95bfe5"],
  ["bournemouth", "Bournemouth", "BOU", "#da291c", "#111111", "AFC Bournemouth"],
  ["brentford", "Brentford", "BRE", "#e30613", "#ffffff"],
  ["brighton", "Brighton", "BHA", "#0057b8", "#ffffff", "Brighton and Hove Albion", "Brighton & Hove Albion"],
  ["chelsea", "Chelsea", "CHE", "#034694", "#ffffff"],
  ["coventry", "Coventry City", "COV", "#59cbe8", "#ffffff", "Coventry"],
  ["crystal-palace", "Crystal Palace", "CRY", "#1b458f", "#c4122e"],
  ["everton", "Everton", "EVE", "#003399", "#ffffff"],
  ["fulham", "Fulham", "FUL", "#ffffff", "#111111"],
  ["hull", "Hull City", "HUL", "#f5a12d", "#111111", "Hull", "Hull City AFC"],
  ["ipswich", "Ipswich Town", "IPS", "#0044a9", "#ffffff", "Ipswich"],
  ["leeds", "Leeds United", "LEE", "#ffffff", "#1d428a", "Leeds"],
  ["liverpool", "Liverpool", "LIV", "#c8102e", "#00b2a9"],
  ["man-city", "Manchester City", "MCI", "#6cabdd", "#ffffff", "Man City"],
  ["man-united", "Manchester United", "MUN", "#da291c", "#fbe122", "Man United", "Man Utd"],
  ["newcastle", "Newcastle United", "NEW", "#241f20", "#ffffff", "Newcastle"],
  ["nottingham-forest", "Nottingham Forest", "NFO", "#dd0000", "#ffffff", "Nott'm Forest"],
  ["sunderland", "Sunderland", "SUN", "#eb172b", "#ffffff"],
  ["tottenham", "Tottenham", "TOT", "#132257", "#ffffff", "Tottenham Hotspur"],
  ["west-ham", "West Ham", "WHU", "#7a263a", "#1bb1e7", "West Ham United"],
  ["wolves", "Wolverhampton", "WOL", "#fdb913", "#231f20", "Wolves", "Wolverhampton Wanderers"],
  ["burnley", "Burnley", "BUR", "#6c1d45", "#99d6ea"],
  ["leicester", "Leicester City", "LEI", "#003090", "#fdbe11", "Leicester"],
  ["luton", "Luton Town", "LUT", "#f78f1e", "#002d62", "Luton"],
  ["norwich", "Norwich City", "NOR", "#fff200", "#00a650", "Norwich"],
  ["sheffield-united", "Sheffield United", "SHU", "#ee2737", "#ffffff"],
  ["southampton", "Southampton", "SOU", "#d71920", "#ffffff"],
  ["watford", "Watford", "WAT", "#fbee23", "#ed2127"],
  // Championship
  ["barnsley", "Barnsley", "BAR", "#d71920", "#ffffff"],
  ["birmingham", "Birmingham City", "BIR", "#0000ff", "#ffffff", "Birmingham"],
  ["blackburn", "Blackburn Rovers", "BLB", "#009ee0", "#ffffff", "Blackburn"],
  ["blackpool", "Blackpool", "BLP", "#f68712", "#ffffff"],
  ["bolton", "Bolton Wanderers", "BOL", "#ffffff", "#263c7e", "Bolton"],
  ["bristol-city", "Bristol City", "BRC", "#e21b23", "#ffffff"],
  ["cardiff", "Cardiff City", "CAR", "#0070b5", "#ffffff", "Cardiff"],
  ["charlton", "Charlton Athletic", "CHA", "#d4021d", "#ffffff", "Charlton"],
  ["derby", "Derby County", "DER", "#ffffff", "#111111", "Derby"],
  ["huddersfield", "Huddersfield Town", "HUD", "#0e63ad", "#ffffff", "Huddersfield"],
  ["lincoln", "Lincoln City", "LIN", "#d71920", "#ffffff", "Lincoln"],
  ["middlesbrough", "Middlesbrough", "MID", "#e11b22", "#ffffff"],
  ["millwall", "Millwall", "MIL", "#001d5e", "#ffffff"],
  ["oxford", "Oxford United", "OXF", "#fff200", "#00205b", "Oxford"],
  ["peterborough", "Peterborough United", "PET", "#005daa", "#ffffff", "Peterboro", "Peterborough"],
  ["plymouth", "Plymouth Argyle", "PLY", "#005036", "#ffffff", "Plymouth"],
  ["portsmouth", "Portsmouth", "POR", "#001489", "#ffffff"],
  ["preston", "Preston North End", "PNE", "#ffffff", "#001d5e", "Preston"],
  ["qpr", "QPR", "QPR", "#1d5ba4", "#ffffff", "Queens Park Rangers"],
  ["reading", "Reading", "REA", "#004494", "#ffffff"],
  ["rotherham", "Rotherham United", "ROT", "#d71920", "#ffffff", "Rotherham"],
  ["sheffield-wednesday", "Sheffield Wednesday", "SHW", "#0e00f7", "#ffffff", "Sheffield Weds"],
  ["stoke", "Stoke City", "STK", "#e03a3e", "#ffffff", "Stoke"],
  ["swansea", "Swansea City", "SWA", "#ffffff", "#111111", "Swansea"],
  ["west-brom", "West Bromwich Albion", "WBA", "#122f67", "#ffffff", "West Brom"],
  ["wigan", "Wigan Athletic", "WIG", "#1d59af", "#ffffff", "Wigan"],
  ["wrexham", "Wrexham", "WRE", "#d71920", "#ffffff", "Wrexham AFC"],
  // La Liga
  ["athletic", "Athletic Bilbao", "ATH", "#ee2523", "#ffffff", "Ath Bilbao", "Athletic Club"],
  ["atletico", "Atlético Madrid", "ATM", "#cb3524", "#ffffff", "Ath Madrid", "Atletico Madrid", "Club Atlético de Madrid"],
  ["barcelona", "Barcelona", "BAR", "#a50044", "#004d98", "FC Barcelona"],
  ["celta", "Celta Vigo", "CEL", "#8ac3ee", "#ffffff", "Celta", "RC Celta", "RC Celta de Vigo"],
  ["alaves", "Alavés", "ALA", "#0761af", "#ffffff", "Alaves", "Deportivo Alavés"],
  ["deportivo", "Deportivo", "DEP", "#0066b3", "#ffffff", "Deportivo de A Coruña", "Deportivo La Coruna", "RC Deportivo", "RC Deportivo La Coruña", "La Coruna"],
  ["elche", "Elche", "ELC", "#05642c", "#ffffff"],
  ["espanyol", "Espanyol", "ESP", "#007fc8", "#ffffff", "Espanol", "RCD Espanyol", "RCD Espanyol de Barcelona"],
  ["getafe", "Getafe", "GET", "#005999", "#ffffff"],
  ["levante", "Levante", "LEV", "#b4053f", "#004b97"],
  ["malaga", "Málaga", "MAL", "#00a0e2", "#ffffff", "Malaga"],
  ["osasuna", "Osasuna", "OSA", "#d91a21", "#0a346f", "CA Osasuna"],
  ["racing", "Racing Santander", "RAC", "#00843d", "#ffffff", "Racing de Santander", "Santander", "Real Racing Club de Santander"],
  ["rayo", "Rayo Vallecano", "RAY", "#e53027", "#ffffff", "Vallecano", "Rayo Vallecano de Madrid"],
  ["betis", "Real Betis", "BET", "#00954c", "#ffffff", "Betis"],
  ["real-madrid", "Real Madrid", "RMA", "#ffffff", "#febe10"],
  ["sociedad", "Real Sociedad", "RSO", "#0067b1", "#ffffff", "Sociedad", "Real Sociedad de Fútbol"],
  ["sevilla", "Sevilla", "SEV", "#ffffff", "#d81e05", "Sevilla FC"],
  ["valencia", "Valencia", "VAL", "#ffffff", "#ee3524", "Valencia CF"],
  ["villarreal", "Villarreal", "VIL", "#ffe667", "#005187", "Villarreal CF"],
  ["almeria", "Almería", "ALM", "#ee1119", "#ffffff", "Almeria"],
  ["cadiz", "Cádiz", "CAD", "#ffe500", "#0045a7", "Cadiz"],
  ["girona", "Girona", "GIR", "#cd2534", "#ffffff"],
  ["granada", "Granada", "GRA", "#c31632", "#ffffff"],
  ["las-palmas", "Las Palmas", "LPA", "#ffe400", "#0047ab"],
  ["leganes", "Leganés", "LEG", "#0047ab", "#ffffff", "Leganes"],
  ["mallorca", "Mallorca", "MLL", "#e20613", "#111111", "RCD Mallorca"],
  ["oviedo", "Real Oviedo", "OVI", "#0047ab", "#ffffff", "Oviedo"],
  ["valladolid", "Valladolid", "VLL", "#921b88", "#ffffff", "Real Valladolid"],
  // Serie A
  ["milan", "Milan", "MIL", "#fb090b", "#111111", "AC Milan"],
  ["atalanta", "Atalanta", "ATA", "#1e71b8", "#111111"],
  ["bologna", "Bologna", "BOL", "#1a2f48", "#a21c26"],
  ["cagliari", "Cagliari", "CAG", "#002350", "#b01028"],
  ["como", "Como", "COM", "#003da5", "#ffffff", "Como 1907"],
  ["fiorentina", "Fiorentina", "FIO", "#482e92", "#ffffff"],
  ["frosinone", "Frosinone", "FRO", "#ffd200", "#0047ab"],
  ["genoa", "Genoa", "GEN", "#a61c33", "#002855"],
  ["inter", "Inter", "INT", "#0068a8", "#111111", "Inter Milan", "Internazionale", "FC Internazionale Milano"],
  ["juventus", "Juventus", "JUV", "#111111", "#ffffff"],
  ["lazio", "Lazio", "LAZ", "#87d8f7", "#ffffff"],
  ["lecce", "Lecce", "LEC", "#ffd200", "#da291c"],
  ["monza", "Monza", "MON", "#e30613", "#ffffff"],
  ["napoli", "Napoli", "NAP", "#12a0d7", "#ffffff", "SSC Napoli"],
  ["parma", "Parma", "PAR", "#ffd200", "#0047ab"],
  ["roma", "Roma", "ROM", "#8e1f2f", "#f0bc42", "AS Roma"],
  ["sassuolo", "Sassuolo", "SAS", "#00a752", "#111111"],
  ["torino", "Torino", "TOR", "#8a1e03", "#ffffff"],
  ["udinese", "Udinese", "UDI", "#111111", "#ffffff"],
  ["venezia", "Venezia", "VEN", "#ff6a13", "#00713d"],
  ["cremonese", "Cremonese", "CRE", "#e30613", "#a5a5a5"],
  ["empoli", "Empoli", "EMP", "#0047ab", "#ffffff"],
  ["pisa", "Pisa", "PIS", "#0047ab", "#111111"],
  ["salernitana", "Salernitana", "SAL", "#7a1e3c", "#ffffff"],
  ["sampdoria", "Sampdoria", "SAM", "#0047ab", "#ffffff"],
  ["spezia", "Spezia", "SPE", "#ffffff", "#111111"],
  ["verona", "Hellas Verona", "VER", "#ffd200", "#002f6c", "Verona"],
  // Bundesliga
  ["augsburg", "Augsburg", "FCA", "#ba3733", "#46714d", "FC Augsburg"],
  ["leverkusen", "Leverkusen", "B04", "#e32221", "#111111", "Bayer Leverkusen"],
  ["bayern", "Bayern Münih", "FCB", "#dc052d", "#ffffff", "Bayern Munich", "Bayern München", "FC Bayern München"],
  ["dortmund", "Dortmund", "BVB", "#fde100", "#111111", "Borussia Dortmund"],
  ["gladbach", "M'gladbach", "BMG", "#111111", "#00b04f", "Borussia Mönchengladbach", "Borussia Monchengladbach"],
  ["frankfurt", "Eintracht Frankfurt", "SGE", "#e1000f", "#111111", "Ein Frankfurt"],
  ["elversberg", "Elversberg", "SVE", "#111111", "#ffffff", "SV Elversberg"],
  ["freiburg", "Freiburg", "SCF", "#111111", "#e2001a", "SC Freiburg"],
  ["hamburg", "Hamburg", "HSV", "#0a3f86", "#ffffff", "Hamburger SV"],
  ["hoffenheim", "Hoffenheim", "TSG", "#1961b5", "#ffffff", "TSG Hoffenheim"],
  ["koln", "Köln", "KOE", "#ed1c24", "#ffffff", "FC Koln", "1. FC Köln", "Koln"],
  ["mainz", "Mainz", "M05", "#c3141e", "#ffffff", "Mainz 05", "1. FSV Mainz 05"],
  ["paderborn", "Paderborn", "SCP", "#0047ab", "#111111", "SC Paderborn 07"],
  ["leipzig", "RB Leipzig", "RBL", "#dd0741", "#ffffff"],
  ["schalke", "Schalke 04", "S04", "#004d9d", "#ffffff", "FC Schalke 04"],
  ["stuttgart", "Stuttgart", "VFB", "#e32219", "#ffffff", "VfB Stuttgart"],
  ["union-berlin", "Union Berlin", "FCU", "#eb1923", "#ffd200", "1. FC Union Berlin"],
  ["werder", "Werder Bremen", "SVW", "#1d9053", "#ffffff"],
  ["bielefeld", "Bielefeld", "DSC", "#004e95", "#111111", "Arminia Bielefeld"],
  ["bochum", "Bochum", "BOC", "#005ca9", "#ffffff", "VfL Bochum"],
  ["darmstadt", "Darmstadt", "D98", "#004e9f", "#ffffff", "Darmstadt 98"],
  ["greuther-furth", "Greuther Fürth", "SGF", "#009a3d", "#ffffff", "Greuther Furth"],
  ["heidenheim", "Heidenheim", "HDH", "#e2001a", "#003b79", "1. FC Heidenheim"],
  ["hertha", "Hertha Berlin", "BSC", "#005ca9", "#ffffff", "Hertha"],
  ["holstein-kiel", "Holstein Kiel", "KSV", "#0b3f8b", "#ffffff"],
  ["st-pauli", "St. Pauli", "STP", "#5e3a1c", "#ffffff", "St Pauli", "FC St. Pauli"],
  ["wolfsburg", "Wolfsburg", "WOB", "#65b32e", "#ffffff", "VfL Wolfsburg"],
  // Ligue 1
  ["ajaccio", "Ajaccio", "ACA", "#d71920", "#ffffff", "AC Ajaccio"],
  ["angers", "Angers", "ANG", "#111111", "#ffffff", "Angers SCO"],
  ["auxerre", "Auxerre", "AUX", "#ffffff", "#005ba6", "AJ Auxerre"],
  ["bordeaux", "Bordeaux", "BOR", "#14213d", "#ffffff", "Girondins de Bordeaux"],
  ["brest", "Brest", "BRE", "#e30613", "#ffffff", "Stade Brestois"],
  ["clermont", "Clermont", "CLE", "#c8102e", "#00205b", "Clermont Foot"],
  ["le-havre", "Le Havre", "HAC", "#7fb5e4", "#00205b", "Le Havre AC"],
  ["le-mans", "Le Mans", "LMS", "#d71920", "#ffd200", "Le Mans FC"],
  ["lens", "Lens", "RCL", "#ffd200", "#e30613", "RC Lens"],
  ["lille", "Lille", "LIL", "#e01e13", "#ffffff", "LOSC Lille", "LOSC"],
  ["lorient", "Lorient", "LOR", "#f58220", "#111111", "FC Lorient"],
  ["lyon", "Lyon", "OL", "#ffffff", "#1e3a8a", "Olympique Lyonnais", "Olympique Lyon"],
  ["marseille", "Marseille", "OM", "#2faee0", "#ffffff", "Olympique de Marseille", "Olympique Marseille"],
  ["metz", "Metz", "MET", "#7d1d34", "#ffffff", "FC Metz"],
  ["monaco", "Monaco", "MON", "#e7221a", "#ffffff", "AS Monaco"],
  ["montpellier", "Montpellier", "MTP", "#f37021", "#003366", "Montpellier HSC"],
  ["nantes", "Nantes", "NAN", "#fce300", "#00843d", "FC Nantes"],
  ["nice", "Nice", "NIC", "#d71920", "#111111", "OGC Nice"],
  ["paris-fc", "Paris FC", "PFC", "#00205b", "#ffffff"],
  ["psg", "Paris Saint-Germain", "PSG", "#004170", "#da291c", "Paris SG", "PSG"],
  ["reims", "Reims", "REI", "#e30613", "#ffffff", "Stade de Reims"],
  ["rennes", "Rennes", "REN", "#e13327", "#111111", "Stade Rennais", "Stade Rennais FC"],
  ["saint-etienne", "Saint-Étienne", "STE", "#00a651", "#ffffff", "St Etienne", "Saint Etienne", "AS Saint-Étienne"],
  ["strasbourg", "Strasbourg", "STR", "#009fe3", "#ffffff", "RC Strasbourg", "RC Strasbourg Alsace"],
  ["toulouse", "Toulouse", "TFC", "#5b2b82", "#ffffff", "Toulouse FC"],
  ["troyes", "Troyes", "ETG", "#0057a8", "#ffffff", "ESTAC Troyes", "ES Troyes AC"],
  // Eredivisie
  ["ajax", "Ajax", "AJA", "#d2122e", "#ffffff", "AFC Ajax"],
  ["az", "AZ Alkmaar", "AZ", "#db0021", "#ffffff", "AZ"],
  ["almere", "Almere City", "ALM", "#d71920", "#111111", "Almere City FC"],
  ["cambuur", "Cambuur", "CAM", "#ffd200", "#0057a8", "SC Cambuur"],
  ["den-haag", "ADO Den Haag", "ADO", "#ffd200", "#00843d", "Den Haag", "ADO"],
  ["excelsior", "Excelsior", "EXC", "#111111", "#e30613", "SBV Excelsior", "Excelsior Rotterdam"],
  ["emmen", "FC Emmen", "EMM", "#d71920", "#ffffff", "Emmen"],
  ["feyenoord", "Feyenoord", "FEY", "#e30613", "#111111"],
  ["sittard", "Fortuna Sittard", "FOR", "#ffd200", "#00843d", "For Sittard", "Fortuna"],
  ["go-ahead", "Go Ahead Eagles", "GAE", "#e30613", "#ffd200"],
  ["groningen", "Groningen", "GRO", "#00843d", "#ffffff", "FC Groningen"],
  ["heerenveen", "Heerenveen", "HEE", "#0057a8", "#ffffff", "SC Heerenveen"],
  ["heracles", "Heracles", "HER", "#111111", "#ffffff", "Heracles Almelo"],
  ["nac", "NAC Breda", "NAC", "#ffd200", "#111111"],
  ["nec", "NEC Nijmegen", "NEC", "#d71920", "#00843d", "Nijmegen", "NEC"],
  ["psv", "PSV Eindhoven", "PSV", "#ed1c24", "#ffffff", "PSV"],
  ["sparta", "Sparta Rotterdam", "SPA", "#e30613", "#ffffff"],
  ["telstar", "Telstar", "TEL", "#ffffff", "#0057a8", "SC Telstar"],
  ["twente", "Twente", "TWE", "#e30613", "#ffffff", "FC Twente"],
  ["utrecht", "Utrecht", "UTR", "#e30613", "#ffffff", "FC Utrecht"],
  ["vitesse", "Vitesse", "VIT", "#ffd200", "#111111", "Vitesse Arnhem"],
  ["volendam", "Volendam", "VOL", "#f58220", "#ffffff", "FC Volendam"],
  ["waalwijk", "RKC Waalwijk", "RKC", "#ffd200", "#0057a8", "Waalwijk", "RKC"],
  ["willem-ii", "Willem II", "WIL", "#e30613", "#0057a8"],
  ["zwolle", "PEC Zwolle", "PEC", "#0057a8", "#ffffff", "Zwolle"],
  // Primeira Liga
  ["avs", "AVS", "AVS", "#d71920", "#ffffff", "AVS Futebol SAD", "AFS"],
  ["academico-viseu", "Académico de Viseu", "ACV", "#111111", "#ffffff", "Academico Viseu", "Académico Viseu"],
  ["alverca", "Alverca", "ALV", "#d71920", "#ffffff", "FC Alverca"],
  ["arouca", "Arouca", "ARO", "#ffd200", "#0057a8", "FC Arouca"],
  ["belenenses", "Belenenses", "BEL", "#0057a8", "#ffffff", "Belenenses SAD", "B SAD"],
  ["benfica", "Benfica", "BEN", "#e30613", "#ffffff", "SL Benfica"],
  ["boavista", "Boavista", "BOA", "#111111", "#ffffff", "Boavista FC"],
  ["casa-pia", "Casa Pia", "CPA", "#111111", "#ffffff", "Casa Pia AC"],
  ["chaves", "Chaves", "CHV", "#d71920", "#0057a8", "GD Chaves"],
  ["estoril", "Estoril", "EST", "#ffd200", "#0057a8", "Estoril Praia"],
  ["estrela", "Estrela Amadora", "EAM", "#d71920", "#00843d", "Estrela"],
  ["famalicao", "Famalicão", "FAM", "#0057a8", "#ffffff", "Famalicao", "FC Famalicão"],
  ["farense", "Farense", "FAR", "#111111", "#ffffff", "SC Farense"],
  ["gil-vicente", "Gil Vicente", "GIL", "#d71920", "#0057a8"],
  ["guimaraes", "Vitória de Guimarães", "VSC", "#ffffff", "#111111", "Guimaraes", "Vitoria Guimaraes", "Vitória Guimarães", "Vitoria de Guimaraes"],
  ["maritimo", "Marítimo", "MAR", "#d71920", "#00843d", "Maritimo", "CS Marítimo"],
  ["moreirense", "Moreirense", "MOR", "#00843d", "#ffffff", "Moreirense FC"],
  ["nacional", "Nacional", "NAC", "#111111", "#ffffff", "Nacional de Madeira", "CD Nacional"],
  ["pacos-ferreira", "Paços de Ferreira", "PAC", "#ffd200", "#00843d", "Pacos Ferreira", "Pacos de Ferreira"],
  ["portimonense", "Portimonense", "PTM", "#111111", "#ffffff"],
  ["porto", "Porto", "POR", "#003e9c", "#ffffff", "FC Porto"],
  ["rio-ave", "Rio Ave", "RAV", "#00843d", "#ffffff", "Rio Ave FC"],
  ["santa-clara", "Santa Clara", "SCL", "#d71920", "#ffffff", "CD Santa Clara"],
  ["braga", "Braga", "SCB", "#e30613", "#ffffff", "Sp Braga", "SC Braga", "Sporting Braga"],
  ["sporting", "Sporting CP", "SCP", "#00804a", "#ffffff", "Sp Lisbon", "Sporting Lisbon", "Sporting"],
  ["tondela", "Tondela", "TON", "#ffd200", "#00843d", "CD Tondela"],
  ["vizela", "Vizela", "VIZ", "#0057a8", "#ffffff", "FC Vizela"],
];

export interface Team {
  slug: string;
  name: string;
  short: string;
  colors: [string, string];
}

export function normalizeName(raw: string): string {
  return raw
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|cfc|afc|sk|fk|ac|acf|as|ss|ssc|us|bc|rc|cd|ud|sd|rcd|sv|vfl|vfb|tsg|calcio|balompie)\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_SLUG = new Map<string, Team>();
const BY_ALIAS = new Map<string, string>();

for (const [slug, name, short, c1, c2, ...aliases] of ROWS) {
  BY_SLUG.set(slug, { slug, name, short, colors: [c1, c2] });
  for (const alias of [slug.replace(/-/g, " "), name, ...aliases]) {
    BY_ALIAS.set(normalizeName(alias), slug);
  }
}

// Clubs from outside the tracked leagues that play in European cups, written by scripts/cups.ts.
for (const [slug, [name, short]] of Object.entries(cupTeams as unknown as Record<string, [string, string]>)) {
  if (BY_SLUG.has(slug)) continue;
  BY_SLUG.set(slug, { slug, name, short, colors: ["#5b6b82", "#ffffff"] });
  if (!BY_ALIAS.has(normalizeName(name))) BY_ALIAS.set(normalizeName(name), slug);
}

// Other sources' spellings (odds feeds, line-ups) that the rows above do not cover.
const SPELLINGS: Record<string, string> = {
  "Sheff Utd": "sheffield-united",
  "Nottm Forest": "nottingham-forest",
  "Borussia M'gladbach": "gladbach",
  "Deportivo A Coruna": "deportivo",
  Cologne: "koln",
  "Cambuur Leeuwarden": "cambuur",
  "Bodo/Glimt": "bodo-glimt",
  "LASK Linz": "lask",
  Sabah: "sabah-baku",
  "Ferencvarosi TC": "ferencvaros",
  "FC Salzburg": "salzburg",
  Lillestrom: "lillestrom",
  "Jagiellonia Bialystok": "jagiellonia-bialystok",
  "KuPS Kuopio": "kups",
  Hearts: "heart-of-midlothian",
  "Mjällby AIF": "mjallby",
  "NK Celje": "celje",
  "Hapoel Beer Sheva": "hapoel-beer-sheva",
  "OFI Crete": "ofi",
  "FC Nordsjaelland": "nordsjaelland",
  "Sint-Truidense": "sint-truiden",
  "CS U Craiova": "universitatea-craiova",
  "KF Egnatia": "egnatia",
  "CSU Craiova": "universitatea-craiova",
  "Ajax Amsterdam": "ajax",
  "Red Star Belgrade": "crvena-zvezda",
  "KAA Gent": "gent",
  AGF: "agf-aarhus",
  "Inter D'Escaldes": "inter-club-d-escaldes",
  "F.C. København": "copenhagen",
};
for (const [name, slug] of Object.entries(SPELLINGS)) if (!BY_ALIAS.has(normalizeName(name))) BY_ALIAS.set(normalizeName(name), slug);

/** Resolve any source spelling to a slug, or null when the name is unknown. */
export function resolveTeam(sourceName: string): string | null {
  return BY_ALIAS.get(normalizeName(sourceName)) ?? null;
}

/** English names, only where the Turkish display name differs. */
const EN_NAMES: Record<string, string> = { bayern: "Bayern Munich" };

export function team(slug: string, lang: "tr" | "en" = "tr"): Team {
  const t = BY_SLUG.get(slug) ?? {
    slug,
    name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    short: slug.slice(0, 3).toUpperCase(),
    colors: ["#8a93a6", "#ffffff"] as [string, string],
  };
  return lang === "en" && EN_NAMES[slug] ? { ...t, name: EN_NAMES[slug] } : t;
}

export function allTeams(): Team[] {
  return [...BY_SLUG.values()];
}
