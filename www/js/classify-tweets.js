/**
 * Script to classify Twitter bookmarks into folders
 * Run this in the browser console after loading the app
 */

const tweetClassifications = {
  "https://twitter.com/elEconomistaes/status/1128972945626419201": "carrera",
  "https://twitter.com/shreyas/status/1244810075908128768": "strategy",
  "https://twitter.com/shreyas/status/1460848932116844550": "strategy",
  "https://twitter.com/PMDiegoGranados/status/1489267708860383234": "interview-prep",
  "https://twitter.com/PMDiegoGranados/status/1538930966126788609": "empleo",
  "https://twitter.com/ToniBono/status/1576983816496812032": "onboarding",
  "https://twitter.com/PMDiegoGranados/status/1582115284269211648": "empleo",
  "https://twitter.com/bandanjot/status/1628288513589248001": "pmf-mvp-vp",
  "https://twitter.com/chalsarboleya/status/1634878423477649408": "ventas-finanzas",
  "https://twitter.com/JustAnotherPM/status/1638875245707923456": "prds",
  "https://twitter.com/jlantunez/status/1649654560191856640": "referencias",
  "https://twitter.com/aakashgupta/status/1655365303839145984": "interview-prep",
  "https://twitter.com/ferrenet/status/1655599423831801856": "carrera",
  "https://twitter.com/TheGoodKnowmad/status/1655682139608760321": "carrera",
  "https://twitter.com/aakashgupta/status/1655736458299187205": "interview-prep",
  "https://twitter.com/dsiroker/status/1657125495463608327": "metricas",
  "https://twitter.com/bandanjot/status/1670344428421283841": "prds",
  "https://twitter.com/0zne/status/1674427752836104192": "being-a-good-pm",
  "https://twitter.com/jjvelazs/status/1674670756632854528": "pmf-mvp-vp",
  "https://twitter.com/paulg/status/1675152564743028743": "carrera",
  "https://twitter.com/KiwiDenny/status/1683040109409566720": "being-a-good-pm",
  "https://twitter.com/JustAnotherPM/status/1683291905701081089": "metricas",
  "https://twitter.com/carlvellotti/status/1685725773292863488": "pmf-mvp-vp",
  "https://twitter.com/KiwiDenny/status/1688143214560108544": "being-a-good-pm",
  "https://twitter.com/bandanjot/status/1688294504657199104": "ventas-finanzas",
  "https://twitter.com/aakashgupta/status/1689120530555871233": "interview-prep",
  "https://twitter.com/aakashgupta/status/1693470739251290265": "prds",
  "https://twitter.com/KiwiDenny/status/1695331305100042655": "pmf-mvp-vp",
  "https://twitter.com/svpino/status/1696187613739208878": "rd-tech",
  "https://twitter.com/aasuero/status/1696510618759475672": "metricas",
  "https://twitter.com/carlvellotti/status/1697049403360494013": "pmf-mvp-vp",
  "https://twitter.com/byosko/status/1699835858226905180": "discovery",
  "https://twitter.com/PatThePM/status/1700847904183738497": "metricas",
  "https://twitter.com/byosko/status/1701654138453479898": "pmf-mvp-vp",
  "https://twitter.com/ParvSondhi/status/1704741418613502385": "pmf-mvp-vp",
  "https://twitter.com/IvanLandabaso/status/1706979438456434745": "frameworks-methodologies",
  "https://twitter.com/KiwiDenny/status/1709525112989348072": "strategy",
  "https://twitter.com/bandanjot/status/1709824542871257212": "metricas",
  "https://twitter.com/aakashgupta/status/1710518388479381594": "empleo",
  "https://twitter.com/bandanjot/status/1711630148070740008": "pmf-mvp-vp",
  "https://twitter.com/ant_murphy/status/1713653214237897178": "onboarding",
  "https://twitter.com/pm_bag/status/1714668785821679999": "being-a-good-pm",
  "https://twitter.com/StartupArchive_/status/1715446607913894110": "pmf-mvp-vp",
  "https://twitter.com/carlvellotti/status/1719427633807593811": "metricas",
  "https://twitter.com/nurijanian/status/1719821710231277613": "okrs",
  "https://twitter.com/yanatweets/status/1720093434747420826": "user-research",
  "https://twitter.com/ttorres/status/1723766109805948984": "growth",
  "https://twitter.com/giropa832/status/1723975174251237794": "frameworks-methodologies",
  "https://twitter.com/ItamarGilad/status/1724714153162477745": "frameworks-methodologies",
  "https://twitter.com/george__mack/status/1726164596019359840": "carrera",
  "https://twitter.com/ttorres/status/1728173400818930134": "metricas",
  "https://twitter.com/nurijanian/status/1728457660628959268": "discovery",
  "https://twitter.com/carlvellotti/status/1728599066639323609": "user-research",
  "https://twitter.com/carlvellotti/status/1731401063977161176": "being-a-good-pm",
  "https://twitter.com/nurijanian/status/1733880771218202652": "pmf-mvp-vp",
  "https://twitter.com/carlvellotti/status/1733937799701610529": "uxui",
  "https://twitter.com/PawelHuryn/status/1738207340984168582": "discovery",
  "https://twitter.com/thiagoghisi/status/1741869380709892261": "carrera",
  "https://twitter.com/JustAnotherPM/status/1742402910238171555": "being-a-good-pm",
  "https://twitter.com/aakashgupta/status/1745892256714805248": "being-a-good-pm",
  "https://twitter.com/nurijanian/status/1750246485042528666": "discovery",
  "https://twitter.com/JustAnotherPM/status/1752632864984944820": "uxui",
  "https://twitter.com/nurijanian/status/1757163216021410126": "strategy",
  "https://twitter.com/JustAnotherPM/status/1761879228671225956": "onboarding",
  "https://twitter.com/FluentInFinance/status/1764405369911054610": "interview-prep",
  "https://twitter.com/ant_murphy/status/1764789094138126732": "pmf-mvp-vp",
  "https://twitter.com/aakashgupta/status/1765136374078873730": "empleo",
  "https://twitter.com/paulg/status/1768344326638014686": "pmf-mvp-vp",
  "https://twitter.com/samuelgil/status/1777978826972131565": "referencias",
  "https://twitter.com/JerryJHLee/status/1778484920593055763": "empleo",
  "https://twitter.com/aakashgupta/status/1778890475614687604": "empleo",
  "https://twitter.com/clairevo/status/1784947615723139206": "product",
  "https://twitter.com/PawelHuryn/status/1787517893871099980": "being-a-good-pm",
  "https://twitter.com/RodrigoAviles_/status/1792226926427345019": "frameworks-methodologies",
  "https://twitter.com/nurijanian/status/1794420863992725972": "comunicacion",
  "https://twitter.com/BoucherNicolas/status/1794748527660421269": "ventas-finanzas",
  "https://twitter.com/ParvSondhi/status/1800030164983910630": "okrs",
  "https://twitter.com/Recuenco/status/1802585841937650108": "user-research",
  "https://twitter.com/bandanjot/status/1802966233790271578": "interview-prep",
  "https://twitter.com/nurijanian/status/1805288538050904164": "referencias",
  "https://twitter.com/carlvellotti/status/1805314607306670331": "strategy",
  "https://twitter.com/aakashgupta/status/1805542252543943107": "pmf-mvp-vp",
  "https://twitter.com/JustAnotherPM/status/1806352107194236967": "being-a-good-pm",
  "https://twitter.com/BrianFeroldi/status/1807030908341367008": "ventas-finanzas",
  "https://twitter.com/nurijanian/status/1807126900302823653": "being-a-good-pm",
  "https://twitter.com/martigouca/status/1808452368784126057": "carrera",
  "https://twitter.com/carlvellotti/status/1810388023076331673": "marketing",
  "https://twitter.com/PawelHuryn/status/1813429808874836361": "frameworks-methodologies",
  "https://twitter.com/alrocar/status/1817562903580422577": "referencias",
  "https://twitter.com/historyinmemes/status/1819317216354902430": "pmf-mvp-vp",
  "https://twitter.com/bandanjot/status/1820379912747814923": "frameworks-methodologies",
  "https://twitter.com/nurijanian/status/1820508825704903116": "product",
  "https://twitter.com/nurijanian/status/1820535260087799969": "frameworks-methodologies",
  "https://twitter.com/PawelHuryn/status/1820875168647938173": "user-research",
  "https://twitter.com/lennysan/status/1820958085009305723": "comunicacion",
  "https://twitter.com/mike_arias/status/1821563685615059371": "competitive",
  "https://twitter.com/JustAnotherPM/status/1823600452157788382": "carrera",
  "https://twitter.com/aakashgupta/status/1825381879815581851": "metricas",
  "https://twitter.com/benln/status/1828070006212424002": "ventas-finanzas",
  "https://twitter.com/nurijanian/status/1835004341981528437": "okrs",
  "https://twitter.com/PawelHuryn/status/1835010864585621892": "being-a-good-pm",
  "https://twitter.com/nurijanian/status/1837903443174084793": "user-research",
  "https://twitter.com/HighSignal_AI/status/1838289874769572072": "product",
  "https://twitter.com/nurijanian/status/1841901043850084521": "being-a-good-pm",
  "https://twitter.com/felixleezd/status/1852017782503936483": "uxui",
  "https://twitter.com/PawelHuryn/status/1853503605833162990": "metricas",
  "https://twitter.com/IvanLandabaso/status/1854848433850306768": "agents",
  "https://twitter.com/nurijanian/status/1870499479251820715": "discovery",
  "https://twitter.com/AdrienBrault/status/1870746848576905428": "discovery",
  "https://twitter.com/jay_ships/status/1877727641576628722": "ai",
  "https://twitter.com/lennysan/status/1879618532000080274": "metricas",
  "https://twitter.com/carlvellotti/status/1886421766563623348": "being-a-good-pm",
  "https://twitter.com/lennysan/status/1889008405584683091": "referencias",
  "https://twitter.com/cbusquets/status/1889826841256399115": "uxui",
  "https://twitter.com/karpathy/status/1894099637218545984": "ai",
  "https://twitter.com/lennysan/status/1894440880893038953": "strategy",
  "https://twitter.com/foundertribune/status/1896198008968257697": "product",
  "https://twitter.com/alexsssaint/status/1899328690095276498": "pmf-mvp-vp",
  "https://twitter.com/javisantana/status/1899353612007989445": "discovery",
  "https://twitter.com/lennysan/status/1907105197488533925": "interview-prep",
  "https://twitter.com/JustAnotherPM/status/1913985259345244619": "comunicacion",
  "https://twitter.com/nikitabier/status/1916156794663055865": "pmf-mvp-vp",
  "https://twitter.com/jjvelazs/status/1931999530003636490": "ventas-finanzas",
  "https://twitter.com/ttorres/status/1933296711658815722": "ai",
  "https://twitter.com/PaulSkallas/status/1934615086066516051": "carrera",
  "https://twitter.com/shreyas/status/1940581334717726773": "carrera",
  "https://twitter.com/ttorres/status/1941702440379621653": "ai",
  "https://twitter.com/nurijanian/status/1941964899791561050": "referencias",
  "https://twitter.com/petergyang/status/1942958414654820366": "ai",
  "https://twitter.com/garrytan/status/1943669215652728866": "carrera",
  "https://twitter.com/carlvellotti/status/1944147262508347849": "frameworks-methodologies",
  "https://twitter.com/nurijanian/status/1944412015675719736": "agents",
  "https://twitter.com/EthanEvansVP/status/1944785254046175693": "carrera",
  "https://twitter.com/nurijanian/status/1944864553030050001": "referencias",
  "https://twitter.com/lennysan/status/1945153340725452899": "referencias",
  "https://twitter.com/ttorres/status/1945326383330197779": "ai",
  "https://twitter.com/petergyang/status/1945491133435728355": "agents",
  "https://twitter.com/lennysan/status/1947341731575566591": "referencias",
  "https://twitter.com/aaditsh/status/1950074311299244197": "ai",
  "https://twitter.com/aakashgupta/status/1950768889555718233": "agents",
  "https://twitter.com/carlvellotti/status/1952796503116005598": "pmf-mvp-vp",
  "https://twitter.com/lennysan/status/1952813442060214664": "ai",
  "https://twitter.com/DanielBlancoSWE/status/1953468402095341722": "frameworks-methodologies",
  "https://twitter.com/carlvellotti/status/1953489578855432258": "comunicacion",
  "https://twitter.com/shreyas/status/1954618417585209440": "carrera",
  "https://twitter.com/joulee/status/1954742305958813726": "product",
  "https://twitter.com/aakashgupta/status/1955555940788502878": "being-a-good-pm",
  "https://twitter.com/_avichawla/status/1956966727042154846": "mcp",
  "https://twitter.com/petergyang/status/1957604703912751253": "ai",
  "https://twitter.com/IvanLandabaso/status/1958250634907713592": "strategy",
  "https://twitter.com/linear/status/1958556205342736631": "vibe-coding",
  "https://twitter.com/FoundersPodcast/status/1960041069376401792": "referencias",
  "https://twitter.com/Mubarratc/status/1960439496417112473": "mcp",
  "https://twitter.com/adamsvoboda/status/1961942296443675049": "referencias",
  "https://twitter.com/realmadhuguru/status/1963452646662259082": "ai",
  "https://twitter.com/lennysan/status/1963691063509680202": "ai",
  "https://twitter.com/arpit_bhayani/status/1972503297777963279": "onboarding",
  "https://twitter.com/SarahChieng/status/1972725629293674933": "discovery",
  "https://twitter.com/lennysan/status/1972786023861301644": "product",
  "https://twitter.com/kushalbyatnal/status/1973039396539465904": "agents",
  "https://twitter.com/lennysan/status/1973068261458846018": "comunicacion",
  "https://twitter.com/AndrewYNg/status/1973090336068215058": "agents",
  "https://twitter.com/kashyechuri/status/1973476125990068509": "vibe-coding",
  "https://twitter.com/DotCSV/status/1975270996794864006": "ai",
  "https://twitter.com/aakashgupta/status/1975305742078124227": "vibe-coding",
  "https://twitter.com/petergyang/status/1975589436705677831": "product",
  "https://twitter.com/mattpocockuk/status/1975655749251436738": "agents",
  "https://twitter.com/thenanyu/status/1976119079086800950": "vibe-coding",
  "https://twitter.com/ryolu_/status/1977414989301641315": "uxui",
  "https://twitter.com/lennysan/status/1978130461596745856": "vibe-coding",
  "https://twitter.com/businessbarista/status/1978257088477348092": "agents",
  "https://twitter.com/lennysan/status/1978569391118979542": "product",
  "https://twitter.com/businessbarista/status/1978988763620741503": "carrera",
  "https://twitter.com/petergyang/status/1979192581667066154": "ai",
  "https://twitter.com/dwarkesh_sp/status/1979234976777539987": "ai",
  "https://twitter.com/PawelHuryn/status/1981036301060096371": "agents",
  "https://twitter.com/linear/status/1981036935477960711": "ai",
  "https://twitter.com/StartupArchive_/status/1982052056878780844": "carrera",
  "https://twitter.com/jack/status/1982168068609486974": "referencias",
  "https://twitter.com/aasuero/status/1988364455219261623": "ai",
  "https://twitter.com/ArthurCahuantzi/status/1989749227376042027": "strategy",
  "https://twitter.com/brian_armstrong/status/1990073384022020290": "carrera",
  "https://twitter.com/aakashgupta/status/1990134816977940841": "carrera",
  "https://twitter.com/kevinyien/status/1990280410388140375": "comunicacion",
  "https://twitter.com/hubermanlab/status/1990434765502284165": "comunicacion",
  "https://twitter.com/nikitabier/status/1990479124536905866": "product",
  "https://twitter.com/ycombinator/status/1991522340547563981": "uxui",
  "https://twitter.com/Kpaxs/status/1994119768664621244": "carrera",
  "https://twitter.com/sksiitb/status/1994926304295301615": "referencias",
  "https://twitter.com/naval/status/1996684253334327660": "product",
  "https://twitter.com/karrisaarinen/status/1999512153313935864": "product",
  "https://twitter.com/karrisaarinen/status/1999730838280503775": "referencias",
  "https://twitter.com/bibryam/status/2000218470194246014": "rd-tech",
  "https://twitter.com/0xlelouch_/status/2004112895182000317": "rd-tech",
  "https://twitter.com/koylanai/status/2004645108830928913": "ai",
  "https://twitter.com/petergyang/status/2004669956395581565": "rd-tech",
  "https://twitter.com/_The_Prophet__/status/2004796159299084424": "ai",
  "https://twitter.com/SuhailKakar/status/2005610738149433683": "referencias",
  "https://twitter.com/carlvellotti/status/2005664125830222098": "vibe-coding",
  "https://twitter.com/vixsheikh/status/2006525378417012898": "referencias",
  "https://twitter.com/lugaricano/status/2007019676618932562": "referencias",
  "https://twitter.com/bcherny/status/2007179832300581177": "vibe-coding",
  "https://twitter.com/oprydai/status/2007486489509409099": "llms-tools",
  "https://twitter.com/aakashgupta/status/2008432693256556991": "agents",
  "https://twitter.com/Saboo_Shubham_/status/2008742211194913117": "referencias",
  "https://twitter.com/RodrigoAviles_/status/2010471533706170434": "referencias",
  "https://twitter.com/neilsuperduper/status/2011135037400629345": "vibe-coding"
};

function classifyAllTweets() {
  const articles = getManualArticles();
  let classified = 0;
  let alreadyClassified = 0;
  let notFound = 0;

  for (const [url, folder] of Object.entries(tweetClassifications)) {
    const article = articles.find(a => a.link === url);
    if (article) {
      if (!article.folder) {
        article.folder = folder;
        classified++;
      } else {
        alreadyClassified++;
      }
    } else {
      notFound++;
    }
  }

  saveManualArticles(articles);

  // Sync to cloud if authenticated
  if (isAuthenticated()) {
    syncClassificationsToCloud(articles.filter(a => a.source === 'twitter'));
  }

  console.log(`Classification complete:`);
  console.log(`- Classified: ${classified}`);
  console.log(`- Already had folder: ${alreadyClassified}`);
  console.log(`- Not found: ${notFound}`);

  // Refresh display
  if (typeof displayTwitterPosts === 'function') {
    displayTwitterPosts();
  }

  return { classified, alreadyClassified, notFound };
}

async function syncClassificationsToCloud(twitterArticles) {
  if (!isAuthenticated()) return;

  const supabase = getSupabaseClient();
  const user = getUser();

  for (const article of twitterArticles) {
    if (article.folder) {
      try {
        await supabase
          .from('manual_articles')
          .update({ folder: article.folder })
          .eq('user_id', user.id)
          .eq('url', article.link);
      } catch (e) {
        console.error('Error syncing folder for', article.link, e);
      }
    }
  }

  console.log('Cloud sync complete');
}

// Run classification
console.log('Starting tweet classification...');
classifyAllTweets();
