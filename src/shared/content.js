'use strict';

// Language-independent content for the Rhodiola rosea modal: photo credits and
// scientific sources. Captions and all prose live in the locale files.

// Every photo is from Wikimedia Commons and is used under its free licence.
// Keep this list in sync with CREDITS.md.
const IMAGES = [
  {
    id: 'hero-golden-flowers',
    file: 'images/rhodiola/hero-golden-flowers.jpg',
    author: 'Hedwig Storch',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rosenwurz_(Rhodiola_rosea)_5727.JPG',
  },
  {
    id: 'banner-blue-leaves',
    file: 'images/rhodiola/banner-blue-leaves.jpg',
    author: 'Harvey Barrison',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiola_rosea_(10319500433).jpg',
  },
  {
    id: 'coast-norway',
    file: 'images/rhodiola/coast-norway.jpg',
    author: 'Finn Rindahl',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rosenrot_og_m%C3%A5segg.jpg',
    gallery: true,
  },
  {
    id: 'mountain-habitat',
    file: 'images/rhodiola/mountain-habitat.jpg',
    author: 'Alpsdake',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiola_rosea_and_Mount_Yari.JPG',
    gallery: true,
  },
  {
    id: 'male-flowers',
    file: 'images/rhodiola/male-flowers.jpg',
    author: 'Alpsdake',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiola_rosea_(male_flower_s2).jpg',
    gallery: true,
  },
  {
    id: 'female-fruits',
    file: 'images/rhodiola/female-fruits.jpg',
    author: 'Alpsdake',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiola_rosea_(fruits_s9).jpg',
    gallery: true,
  },
  {
    id: 'star-rosette',
    file: 'images/rhodiola/star-rosette.jpg',
    author: 'Tournasol7',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiola_rosea_at_Lac_d%27Oo_(3).jpg',
    gallery: true,
  },
  {
    id: 'dried-root',
    file: 'images/rhodiola/dried-root.jpg',
    author: 'Badagnani',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Rhodiolaroseadried.jpg',
    gallery: true,
  },
  {
    id: 'rosavin-molecule',
    file: 'images/rhodiola/rosavin-molecule.png',
    author: 'Innerstream',
    license: 'Public domain',
    licenseUrl: '',
    source: 'https://commons.wikimedia.org/wiki/File:Rosavin.svg',
  },
  {
    id: 'salidroside-molecule',
    file: 'images/rhodiola/salidroside-molecule.png',
    author: 'Innerstream',
    license: 'Public domain',
    licenseUrl: '',
    source: 'https://commons.wikimedia.org/wiki/File:Salidroside.svg',
  },
];

// Numbered so the benefit cards can cite them as [n].
const SOURCES = [
  { id: 1, text: 'Panossian A, Wikman G. Effects of adaptogens on the central nervous system and the molecular mechanisms associated with their stress-protective activity. Pharmaceuticals. 2010;3(1):188–224.', url: 'https://doi.org/10.3390/ph3010188' },
  { id: 2, text: 'Darbinyan V, et al. Rhodiola rosea in stress induced fatigue — a double blind cross-over study of a standardized extract SHR-5 with a repeated low-dose regimen on the mental performance of healthy physicians during night duty. Phytomedicine. 2000;7(5):365–371.', url: 'https://doi.org/10.1016/S0944-7113(00)80055-0' },
  { id: 3, text: 'Shevtsov VA, et al. A randomized trial of two different doses of a SHR-5 Rhodiola rosea extract versus placebo and control of capacity for mental work. Phytomedicine. 2003;10(2–3):95–105.', url: 'https://doi.org/10.1078/094471103321659780' },
  { id: 4, text: 'Spasov AA, et al. A double-blind, placebo-controlled pilot study of the stimulating and adaptogenic effect of Rhodiola rosea SHR-5 extract on the fatigue of students caused by stress during an examination period. Phytomedicine. 2000;7(2):85–89.', url: 'https://doi.org/10.1016/S0944-7113(00)80078-1' },
  { id: 5, text: 'Olsson EM, von Schéele B, Panossian AG. A randomised, double-blind, placebo-controlled, parallel-group study of the standardised extract SHR-5 of the roots of Rhodiola rosea in the treatment of subjects with stress-related fatigue. Planta Medica. 2009;75(2):105–112.', url: 'https://doi.org/10.1055/s-0028-1088346' },
  { id: 6, text: 'Lekomtseva Y, Zhukova I, Wacker A. Rhodiola rosea in subjects with prolonged or chronic fatigue symptoms: results of an open-label clinical trial. Complementary Medicine Research. 2017;24(1):46–52.', url: 'https://doi.org/10.1159/000457918' },
  { id: 7, text: 'Kasper S, Dienel A. Multicenter, open-label, exploratory clinical trial with Rhodiola rosea extract in patients suffering from burnout symptoms. Neuropsychiatric Disease and Treatment. 2017;13:889–898.', url: 'https://doi.org/10.2147/NDT.S120113' },
  { id: 8, text: 'Darbinyan V, et al. Clinical trial of Rhodiola rosea L. extract SHR-5 in the treatment of mild to moderate depression. Nordic Journal of Psychiatry. 2007;61(5):343–348.', url: 'https://doi.org/10.1080/08039480701643290' },
  { id: 9, text: 'Mao JJ, et al. Rhodiola rosea versus sertraline for major depressive disorder: a randomized placebo-controlled trial. Phytomedicine. 2015;22(3):394–399.', url: 'https://doi.org/10.1016/j.phymed.2015.01.010' },
  { id: 10, text: 'De Bock K, et al. Acute Rhodiola rosea intake can improve endurance exercise performance. International Journal of Sport Nutrition and Exercise Metabolism. 2004;14(3):298–307.', url: 'https://doi.org/10.1123/ijsnem.14.3.298' },
  { id: 11, text: 'Noreen EE, et al. The effects of an acute dose of Rhodiola rosea on endurance exercise performance. Journal of Strength and Conditioning Research. 2013;27(3):839–847.', url: 'https://doi.org/10.1519/JSC.0b013e31825d9799' },
  { id: 12, text: 'van Diermen D, et al. Monoamine oxidase inhibition by Rhodiola rosea L. roots. Journal of Ethnopharmacology. 2009;122(2):397–401.', url: 'https://doi.org/10.1016/j.jep.2009.01.007' },
  { id: 13, text: 'Panossian A, Wikman G, Kaur P, Asea A. Adaptogens exert a stress-protective effect by modulation of expression of molecular chaperones. Phytomedicine. 2009;16(6–7):617–622.', url: 'https://doi.org/10.1016/j.phymed.2008.12.003' },
  { id: 14, text: 'Abidov M, et al. Effect of extracts from Rhodiola rosea and Rhodiola crenulata (Crassulaceae) roots on ATP content in mitochondria of skeletal muscles. Bulletin of Experimental Biology and Medicine. 2003;136(6):585–587.', url: 'https://doi.org/10.1023/B:BEBM.0000020211.24779.15' },
  { id: 15, text: 'Ishaque S, Shamseer L, Bukutu C, Vohra S. Rhodiola rosea for physical and mental fatigue: a systematic review. BMC Complementary and Alternative Medicine. 2012;12:70.', url: 'https://doi.org/10.1186/1472-6882-12-70' },
  { id: 16, text: 'Hung SK, Perry R, Ernst E. The effectiveness and efficacy of Rhodiola rosea L.: a systematic review of randomized clinical trials. Phytomedicine. 2011;18(4):235–244.', url: 'https://doi.org/10.1016/j.phymed.2010.08.014' },
  { id: 17, text: 'Booker A, et al. The authenticity and quality of Rhodiola rosea products. Phytomedicine. 2016;23(7):754–762.', url: 'https://doi.org/10.1016/j.phymed.2015.10.006' },
  { id: 18, text: 'National Center for Complementary and Integrative Health (NIH). Rhodiola — fact sheet.', url: 'https://www.nccih.nih.gov/health/rhodiola' },
  { id: 19, text: 'European Medicines Agency, Committee on Herbal Medicinal Products. Rhodiolae roseae rhizoma et radix — herbal medicine overview.', url: 'https://www.ema.europa.eu/en/medicines/herbal/rhodiolae-roseae-rhizoma-et-radix' },
];

module.exports = { IMAGES, SOURCES };
