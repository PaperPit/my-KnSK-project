-- ============================================================
-- Автосгенерированный импорт данных из Google Sheets в Supabase
-- Записей: 5
-- Сгенерировано: 2026-05-20 21:47:00
-- ============================================================

-- Отчёт #1 (сохранён: 2026-04-17)
INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES (1, '2026-04-17', '«Масштабирование онкоскрининговых исследований» 01.01.2026 - 17.04.2026', '• Аналитика показателей проекта по прохождению этапов онкоскрининга, период: с 13.04.2026 - 19.04.2026;
• Обновление статистики для еженедельной ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
• Анализ нецелевого использования ячеек для записи на колоноскопию (не по показаниям или не в рамках проекта).
• Обзвон пациентов, имеющих положительный результат количественного исследования кала на скрытую кровь и не прошедших колоноскопию, с целью последующего анализа данных.', '• Подготовлена еженедельная статистика по проекту для ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
• Внесены изменения в дашборд "Онкоскрининг", лист КРР: скорректировано отображение карты МО;
• Проведён анализ диагнозов из направлений всех пациентов, прошедших колоноскопию в амбулаторных кабинетах Одинцовской ОБ и Балашихинской Б за март 2026 года;
• Обзвон пациентов, имеющих положительный результат количественного исследования кала на скрытую кровь, но не прошедших колоноскопию(Наро-Фоминская Б и Дмитровская Б).
• Подготовлено обновленное ТЗ для BI "отчёт ДН онко";
• Анализ процента протоколов онкоконсилиума, подписанных электронной цифровой подписью (ЭЦП), в разрезе медицинских организаций.');
-- Недельные данные для отчёта #1
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (1, '2026-03-09', '2026-03-15', 2312);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (1, '2026-03-16', '2026-03-22', 2425);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (1, '2026-03-23', '2026-03-29', 2909);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (1, '2026-03-30', '2026-04-05', 6904);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (1, '2026-04-06', '2026-04-12', 6985);
-- Данные МО для отчёта #1 (49 организаций)
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Дубненская Б', 2068, 2793, 2662, 131, 14, 7, 249, 135.05802707930368);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Одинцовская ОБ', 6227, 7096, 6742, 354, 10, 72, 463, 113.95535570900914);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Наро-Фоминская Б', 2691, 2232, 2131, 101, 2, 7, 161, 82.94314381270902);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Жуковская ОКБ', 2220, 1727, 1636, 91, 7, 36, 108, 77.7927927927928);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Павлово-Посадская Б', 2365, 1741, 1654, 87, 19, 23, 150, 73.61522198731501);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Можайская Б', 1071, 771, 733, 38, 1, 1, 58, 71.98879551820728);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Балашихинская Б', 10417, 7338, 6928, 410, 35, 84, 490, 70.44254583853316);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Дмитровская Б', 3504, 2180, 2037, 143, 6, 14, 432, 62.21461187214612);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Домодедовская Б', 4361, 2543, 2447, 96, 1, 25, 286, 58.31231368952076);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Ногинская Б', 4914, 2657, 2562, 95, 3, 13, 154, 54.070004070004074);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Долгопрудненская Б', 2193, 1115, 1068, 47, 2, 4, 72, 50.84359325125399);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Рузская Б', 1061, 532, 496, 36, 2, 6, 16, 50.141376060320454);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Краснознаменская П', 658, 313, 294, 19, 0, 0, 62, 47.56838905775076);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Химкинская КБ', 5604, 2602, 2513, 89, 20, 11, 941, 46.43112062812277);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Щёлковская Б', 6617, 2623, 2458, 165, 7, 11, 402, 39.64032038688227);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Электростальская Б', 2388, 902, 862, 40, 3, 1, 91, 37.77219430485762);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Орехово-Зуевская Б', 4465, 1587, 1488, 99, 3, 5, 159, 35.54311310190369);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Лобненская Б', 2289, 792, 778, 14, 1, 2, 108, 34.60026212319791);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Реутовская КБ', 1884, 621, 584, 37, 1, 2, 142, 32.961783439490446);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Мытищинская ОКБ', 6182, 1985, 1881, 104, 3, 8, 323, 32.10934972500809);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Коломенская Б', 5226, 1461, 1460, 1, 6, 0, 293, 27.956371986222734);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'ПКБ им. проф. Розанова В.Н.', 5505, 1529, 1435, 94, 3, 13, 87, 27.774750227066303);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Подольская ОКБ', 7883, 2179, 2059, 120, 4, 37, 450, 27.64176075098313);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Люберецкая ОКБ', 7753, 2100, 1940, 160, 2, 13, 320, 27.08628917838256);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Воскресенская Б', 3565, 950, 930, 20, 6, 1, 171, 26.64796633941094);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Королёвская Б', 4704, 1253, 1207, 46, 3, 16, 143, 26.636904761904763);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Протвинская Б', 633, 166, 153, 13, 0, 0, 56, 26.224328593996844);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Лыткаринская Б', 1143, 278, 257, 21, 4, 3, 14, 24.32195975503062);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Сергиево-Посадская Б', 4275, 816, 766, 50, 0, 5, 109, 19.087719298245613);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Егорьевская Б', 2259, 416, 405, 11, 3, 1, 54, 18.415227976980965);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Серебряно-Прудская Б', 502, 53, 51, 2, 0, 0, 1, 10.557768924302788);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Видновская КБ', 4437, 466, 447, 19, 1, 2, 4, 10.502591841334235);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Серпуховская Б', 3184, 268, 250, 18, 3, 1, 43, 8.417085427135678);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Луховицкая Б', 1451, 111, 106, 5, 1, 0, 60, 7.649896623018608);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Чеховская Б', 2648, 182, 177, 5, 1, 0, 69, 6.873111782477341);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Каширская Б', 1137, 71, 68, 3, 1, 1, 0, 6.244503078276165);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Лотошинская Б', 357, 15, 15, 0, 0, 0, 13, 4.201680672268908);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Шатурская Б', 1861, 62, 59, 3, 0, 0, 13, 3.3315421816227833);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Волоколамская Б', 941, 30, 30, 0, 6, 0, 26, 3.1880977683315623);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Ступинская КБ', 2414, 60, 57, 3, 0, 0, 25, 2.4855012427506216);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Солнечногорская Б', 3093, 61, 61, 0, 2, 0, 54, 1.972195279663757);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Клинская Б', 2802, 49, 46, 3, 1, 0, 45, 1.7487508922198431);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Истринская КБ', 3193, 46, 46, 0, 1, 0, 31, 1.4406514249921702);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Раменская Б', 6571, 85, 84, 1, 4, 0, 8, 1.2935626236493685);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Котельниковская П', 1151, 13, 11, 2, 1, 0, 0, 1.1294526498696786);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Зарайская Б', 811, 8, 8, 0, 0, 0, 2, 0.9864364981504316);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Шаховская Б', 494, 4, 4, 0, 0, 0, 4, 0.8097165991902834);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Красногорская Б', 6825, 40, 38, 2, 5, 0, 23, 0.5860805860805861);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (1, 'Поликлиника г.о. Власиха', 3, 0, 0, 0, 0, 0, 0, 0);

-- Отчёт #2 (сохранён: 2026-04-24)
INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES (2, '2026-04-24', '«Масштабирование онкоскрининговых исследований» 01.01.2026 - 24.04.2026', '• Аналитика показателей проекта по прохождению этапов онкоскрининга, период: с 27.04.2026 - 30.04.2026;
• Обновление статистики для еженедельной ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
• Анализ эффективности работы амбулаторной колоноскопической службы на примере следующих медицинских организаций:
Химкинская КБ ;
ПКБ им. проф. Розанова В.Н. ;
Орехово-Зуевская Б ;
Щёлковская Б ;
Ногинская Б ;', '• Подготовлена <a href="https://drive.google.com/file/d/1Lrt6FQcDN3uQ0-mPeAcswyEn22qdX9vr/view?usp=sharing" target="_blank">еженедельная статистика</a> по проекту для ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
• Внесены изменения в дашборд "Онкоскрининг", <a href="http://10.10.18.25:8080/bi/explorer/view/2iiv6pfnuysin-onkologiya" target="_blank">лист КРР</a>:  добавлен раздел "Детализированная таблица по пациентам";
• Проведён анализ диагнозов из направлений всех пациентов, прошедших колоноскопию в амбулаторных кабинетах Дмитровской Б, Дубнинской Б,  Люберцкой ОКБ, Мытищинской ОКБ, Наро-Фоминской Б.;
• Реализован запрет ручного ввода количественных исследований кала на скрытую кровь .
• Сформировано <a href="https://docs.google.com/spreadsheets/d/1Q2UdkJXRgBmRUzDLJcmgDEaQGnLizJNd/edit?usp=sharing&ouid=102697401665684496719&rtpof=true&sd=true" target="_blank">ТЗ для отчета  BI</a>  по снятым с ДН учёта пациентам, с  ежедневной  выгрузкой на сервер ЦОМ.');
-- Недельные данные для отчёта #2
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (2, '2026-03-16', '2026-03-22', 2425);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (2, '2026-03-23', '2026-03-29', 2909);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (2, '2026-03-30', '2026-04-05', 6904);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (2, '2026-04-06', '2026-04-12', 6985);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (2, '2026-04-13', '2026-04-19', 5266);
-- Данные МО для отчёта #2 (49 организаций)
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Дубненская Б', 2068, 2859, 2724, 135, 15, 7, 38, 138.2495164410058);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Одинцовская ОБ', 6227, 7504, 7131, 373, 11, 86, 312, 120.50746748032762);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Наро-Фоминская Б', 2691, 2410, 2302, 108, 2, 8, 145, 89.55778520995912);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Жуковская ОКБ', 2220, 1823, 1728, 95, 8, 38, 76, 82.11711711711712);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Можайская Б', 1071, 847, 805, 42, 1, 1, 65, 79.08496732026144);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Павлово-Посадская Б', 2365, 1827, 1736, 91, 20, 24, 90, 77.25158562367864);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Балашихинская Б', 10417, 7889, 7443, 446, 43, 96, 442, 75.73197657674955);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Домодедовская Б', 4361, 2999, 2881, 118, 1, 35, 457, 68.76863104792479);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Дмитровская Б', 3504, 2240, 2091, 149, 8, 17, 58, 63.926940639269404);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Ногинская Б', 4914, 2846, 2745, 101, 5, 15, 153, 57.916157916157914);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Химкинская КБ', 5604, 3173, 3081, 92, 21, 11, 194, 56.620271234832266);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Рузская Б', 1061, 576, 536, 40, 2, 6, 43, 54.28840716305372);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Краснознаменская П', 658, 357, 335, 22, 0, 0, 44, 54.25531914893617);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Долгопрудненская Б', 2193, 1125, 1077, 48, 2, 4, 10, 51.29958960328317);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Щёлковская Б', 6617, 2935, 2752, 183, 7, 16, 309, 44.35544808825752);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Электростальская Б', 2388, 994, 946, 48, 3, 1, 80, 41.62479061976549);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Орехово-Зуевская Б', 4465, 1762, 1653, 109, 5, 6, 144, 39.46248600223964);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Реутовская КБ', 1884, 704, 659, 45, 1, 5, 85, 37.367303609341825);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Мытищинская ОКБ', 6182, 2308, 2190, 118, 3, 10, 323, 37.33419605305726);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Лобненская Б', 2289, 807, 793, 14, 1, 3, 16, 35.255570117955436);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Коломенская Б', 5226, 1792, 1790, 2, 7, 0, 272, 34.2900880214313);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Воскресенская Б', 3565, 1181, 1160, 21, 8, 1, 156, 33.12762973352034);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'ПКБ им. проф. Розанова В.Н.', 5505, 1711, 1605, 106, 6, 14, 185, 31.080835603996366);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Люберецкая ОКБ', 7753, 2407, 2227, 180, 2, 20, 305, 31.04604669160325);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Протвинская Б', 633, 192, 178, 14, 0, 0, 24, 30.33175355450237);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Королёвская Б', 4704, 1391, 1345, 46, 3, 17, 137, 29.570578231292515);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Подольская ОКБ', 7883, 2276, 2153, 123, 7, 46, 98, 28.872256755042496);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Лыткаринская Б', 1143, 297, 276, 21, 4, 3, 16, 25.984251968503933);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Сергиево-Посадская Б', 4275, 927, 871, 56, 1, 6, 111, 21.684210526315788);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Егорьевская Б', 2259, 484, 470, 14, 6, 1, 66, 21.425409473218238);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Серебряно-Прудская Б', 502, 74, 72, 2, 0, 0, 21, 14.741035856573706);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Видновская КБ', 4437, 642, 619, 23, 2, 4, 175, 14.46923597025017);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Луховицкая Б', 1451, 171, 166, 5, 1, 0, 60, 11.784975878704342);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Лотошинская Б', 357, 32, 32, 0, 0, 0, 14, 8.96358543417367);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Серпуховская Б', 3184, 273, 255, 18, 3, 1, 3, 8.574120603015075);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Каширская Б', 1137, 94, 88, 6, 2, 1, 23, 8.267370272647318);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Шатурская Б', 1861, 141, 136, 5, 0, 0, 79, 7.576571735626008);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Чеховская Б', 2648, 195, 189, 6, 1, 0, 13, 7.36404833836858);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Волоколамская Б', 941, 40, 40, 0, 7, 0, 0, 4.250797024442083);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Солнечногорская Б', 3093, 131, 131, 0, 2, 0, 66, 4.235370190753314);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Ступинская КБ', 2414, 101, 95, 6, 0, 0, 40, 4.183927091963547);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Раменская Б', 6571, 249, 239, 10, 7, 0, 158, 3.7893775681022674);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Истринская КБ', 3193, 105, 102, 3, 1, 0, 54, 3.288443470090824);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Клинская Б', 2802, 86, 81, 5, 1, 0, 32, 3.0692362598144185);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Шаховская Б', 494, 13, 13, 0, 0, 0, 9, 2.631578947368421);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Красногорская Б', 6825, 130, 127, 3, 8, 0, 89, 1.9047619047619049);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Зарайская Б', 811, 14, 14, 0, 0, 0, 4, 1.726263871763255);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'Котельниковская П', 1151, 15, 13, 2, 1, 0, 1, 1.3032145960034751);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (2, 'П г.о. Власиха', 3, 0, 0, 0, 0, 0, 0, 0);

-- Отчёт #3 (сохранён: 2026-04-30)
INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES (3, '2026-04-30', '«Масштабирование онкоскрининговых исследований» 01.01.2026 - 30.04.2026', '1. Аналитика показателей проекта по прохождению этапов онкоскрининга, период: с 27.04.2026 - 30.04.2026;
2. Обновление статистики для еженедельной ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
3. Подготовка МО анализа эффективности работы амбулаторной колоноскопической службы за апрель:
Химкинская КБ ;
ПКБ им. проф. Розанова В.Н. ;
Орехово-Зуевская Б ;
Щёлковская Б ;
Ногинская Б.', '• Подготовлена <a href="https://docs.google.com/presentation/d/1rmihU_mC45nk88VYOU43wBQKM9L3iEi-/edit?usp=sharing&ouid=116292427218582912732&rtpof=true&sd=true" target="_blank">еженедельная статистика по проекту</a> для ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
• Внесены изменения в дашборд "Онкоскрининг", <a href="http://10.10.18.25:8080/bi/explorer/view/2iiv6pfnuysin-onkologiya" target="_blank">лист КРР</a>:  скорректирован раздел "Детализированная таблица по пациентам" добавили дату погрузки и изменили логику столбцов;
• Проведён анализ диагнозов из направлений пациентов, прошедших колоноскопию в амбулаторных кабинетах Химкинской КБ, ПКБ им. проф. Розанова В.Н., Орехово-Зуевской Б, Щёлковской Б, Ногинской Б. ');
-- Недельные данные для отчёта #3
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (3, '2026-03-23', '2026-03-29', 2909);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (3, '2026-03-30', '2026-04-05', 6904);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (3, '2026-04-06', '2026-04-12', 6985);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (3, '2026-04-13', '2026-04-19', 5266);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (3, '2026-04-20', '2026-04-26', 5903);
-- Данные МО для отчёта #3 (49 организаций)
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Дубненская Б', 2068, 2861, 2726, 135, 16, 9, 1, 138.34622823984526);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Одинцовская ОБ', 6227, 8067, 7668, 399, 16, 95, 429, 129.54873936084792);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Наро-Фоминская Б', 2691, 2596, 2482, 114, 1, 11, 150, 96.46971386101822);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Жуковская ОКБ', 2220, 1976, 1877, 99, 10, 40, 130, 89.009009009009);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Можайская Б', 1071, 923, 875, 48, 1, 1, 63, 86.1811391223156);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Павлово-Посадская Б', 2365, 1966, 1871, 95, 19, 27, 134, 83.12896405919662);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Балашихинская Б', 10417, 8451, 7977, 474, 52, 109, 452, 81.12700393587406);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Домодедовская Б', 4361, 3407, 3275, 132, 4, 60, 322, 78.12428342123367);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Краснознаменская П', 658, 438, 412, 26, 0, 0, 65, 66.56534954407294);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Дмитровская Б', 3504, 2244, 2094, 150, 10, 21, 4, 64.04109589041096);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Ногинская Б', 4914, 3095, 2990, 105, 7, 17, 177, 62.98331298331298);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Рузская Б', 1061, 613, 571, 42, 2, 6, 33, 57.77568331762488);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Химкинская КБ', 5604, 3175, 3083, 92, 21, 11, 3, 56.655960028551036);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Долгопрудненская Б', 2193, 1124, 1076, 48, 5, 4, 0, 51.25398996808026);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Щёлковская Б', 6617, 3345, 3145, 200, 10, 20, 271, 50.551609490705765);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Электростальская Б', 2388, 1078, 1026, 52, 3, 1, 53, 45.142378559463985);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Орехово-Зуевская Б', 4465, 1986, 1866, 120, 7, 10, 175, 44.47928331466965);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Реутовская КБ', 1884, 830, 780, 50, 1, 10, 84, 44.0552016985138);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Мытищинская ОКБ', 6182, 2643, 2504, 139, 4, 17, 242, 42.75315431899062);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Коломенская Б', 5226, 2203, 2199, 4, 8, 1, 330, 42.15461155759663);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Воскресенская Б', 3565, 1387, 1364, 23, 10, 3, 192, 38.90603085553997);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Люберецкая ОКБ', 7753, 2789, 2586, 203, 2, 26, 206, 35.97317167548046);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'ПКБ им. проф. Розанова В.Н.', 5505, 1975, 1852, 123, 7, 18, 207, 35.87647593097184);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Лобненская Б', 2289, 808, 795, 13, 1, 5, 1, 35.29925731760594);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Королёвская Б', 4704, 1586, 1534, 52, 3, 17, 155, 33.715986394557824);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Протвинская Б', 633, 209, 195, 14, 0, 0, 18, 33.0173775671406);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Подольская ОКБ', 7883, 2584, 2447, 137, 8, 59, 305, 32.77939870607637);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Лыткаринская Б', 1143, 327, 306, 21, 4, 3, 27, 28.608923884514436);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Егорьевская Б', 2259, 562, 547, 15, 6, 3, 77, 24.87826471890217);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Сергиево-Посадская Б', 4275, 1055, 987, 68, 2, 12, 103, 24.678362573099417);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Видновская КБ', 4437, 883, 846, 37, 2, 8, 240, 19.9008338967771);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Серебряно-Прудская Б', 502, 96, 92, 4, 0, 0, 22, 19.12350597609562);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Лотошинская Б', 357, 65, 63, 2, 0, 0, 31, 18.207282913165265);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Шатурская Б', 1861, 303, 289, 14, 0, 1, 163, 16.281569048898444);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Луховицкая Б', 1451, 224, 217, 7, 1, 0, 53, 15.43762922122674);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Волоколамская Б', 941, 134, 134, 0, 7, 0, 67, 14.240170031880977);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Каширская Б', 1137, 139, 127, 12, 3, 1, 45, 12.225153913808267);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Серпуховская Б', 3184, 365, 347, 18, 3, 1, 93, 11.46356783919598);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Шаховская Б', 494, 47, 47, 0, 0, 0, 26, 9.51417004048583);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Чеховская Б', 2648, 233, 225, 8, 1, 1, 38, 8.799093655589123);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Солнечногорская Б', 3093, 235, 234, 1, 2, 0, 71, 7.597801487229228);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Красногорская Б', 6825, 478, 474, 4, 8, 0, 288, 7.003663003663004);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Истринская КБ', 3193, 214, 210, 4, 2, 0, 84, 6.7021609771374875);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Клинская Б', 2802, 186, 174, 12, 1, 1, 82, 6.638115631691649);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Ступинская КБ', 2414, 146, 138, 8, 0, 0, 45, 6.048053024026512);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Раменская Б', 6571, 382, 363, 19, 6, 1, 136, 5.8134226145183385);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Зарайская Б', 811, 20, 20, 0, 0, 0, 6, 2.466091245376079);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'Котельниковская П', 1151, 20, 18, 2, 1, 0, 4, 1.7376194613379672);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (3, 'П г.о. Власиха', 3, 0, 0, 0, 0, 0, 0, 0);

-- Отчёт #4 (сохранён: 2026-05-08)
INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES (4, '2026-05-08', '«Масштабирование онкоскрининговых исследований» 01.01.2026 - 07.05.2026', '1.  Аналитика показателей проекта по прохождению этапов онкоскрининга, период: с 13.04.2026 - 19.04.2026;
2. Обновление статистики для еженедельной ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным
3. Анализ эффективности работы колоноскопической службы за Апрель 2026 г. в следующих медицинских организациях: Химкинская Б, Ногинская Б, Орехово-Зуевская Б, Щелковская Б, ПКБ Розанова В.Н.', '1. Подготовлена <a href="https://docs.google.com/spreadsheets/d/13ZVqBV_QHFm9QkMIn5QDnXdTdZWV_P6y/edit?gid=421222692#gid=421222692" target="_blank">еженедельная статистика</a> по проекту для ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
2. Проведён анализ диагнозов из направлений пациентов, прошедших колоноскопию в амбулаторных кабинетах Красногорской Б, Одинцовской Б, Истринской Б, Рузской Б, Волоколамской Б;
3. Подготовлен <a href="https://docs.google.com/spreadsheets/d/13ZVqBV_QHFm9QkMIn5QDnXdTdZWV_P6y/edit?gid=421222692#gid=421222692" target="_blank">проект ТЗ</a> для реализации дашборда рака шейки матки с учетом обновлений проекта распоряжения репродуктивного скрининга.');
-- Недельные данные для отчёта #4
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (4, '2026-03-30', '2026-04-05', 6904);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (4, '2026-04-06', '2026-04-12', 6985);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (4, '2026-04-13', '2026-04-19', 5266);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (4, '2026-04-20', '2026-04-26', 5903);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (4, '2026-04-27', '2026-05-03', 1284);
-- Данные МО для отчёта #4 (48 организаций)
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Дубненская Б', 2068, 2860, 2725, 135, 24, 9, 0, 138.29787234042556);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Одинцовская ОБ', 6227, 8134, 7734, 400, 18, 103, 28, 130.62469889192226);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Наро-Фоминская Б', 2691, 2601, 2487, 114, 1, 13, 5, 96.65551839464884);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Жуковская ОКБ', 2220, 1985, 1886, 99, 10, 41, 10, 89.41441441441441);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Можайская Б', 1071, 925, 877, 48, 1, 1, 2, 86.36788048552755);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Павлово-Посадская Б', 2365, 1966, 1870, 96, 19, 27, 2, 83.12896405919662);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Домодедовская Б', 4361, 3616, 3480, 136, 4, 70, 200, 82.91676221050218);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Балашихинская Б', 10417, 8481, 8005, 476, 57, 118, 26, 81.41499472016895);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Краснознаменская П', 658, 438, 412, 26, 0, 0, 0, 66.56534954407294);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Дмитровская Б', 3504, 2274, 2125, 149, 12, 17, 1, 64.8972602739726);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Ногинская Б', 4914, 3097, 2992, 105, 9, 17, 0, 63.02401302401302);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Рузская Б', 1061, 614, 572, 42, 2, 5, 2, 57.869934024505184);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Химкинская КБ', 5604, 3176, 3084, 92, 22, 9, 0, 56.673804425410424);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Долгопрудненская Б', 2193, 1126, 1078, 48, 5, 4, 0, 51.345189238486086);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Щёлковская Б', 6617, 3374, 3174, 200, 10, 24, 17, 50.98987456551307);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Электростальская Б', 2388, 1078, 1026, 52, 3, 1, 2, 45.142378559463985);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Орехово-Зуевская Б', 4465, 1990, 1868, 122, 6, 13, 4, 44.568868980963046);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Коломенская Б', 5226, 2308, 2304, 4, 8, 0, 73, 44.16379640260237);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Реутовская КБ', 1884, 828, 779, 49, 1, 11, 0, 43.94904458598726);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Мытищинская ОКБ', 6182, 2685, 2545, 140, 3, 30, 9, 43.432546101585245);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Воскресенская Б', 3565, 1412, 1389, 23, 10, 4, 26, 39.60729312762973);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Люберецкая ОКБ', 7753, 2903, 2694, 209, 4, 24, 24, 37.44357023087837);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'ПКБ им. проф. Розанова В.Н.', 5505, 2002, 1878, 124, 7, 18, 17, 36.3669391462307);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Лобненская Б', 2289, 810, 796, 14, 1, 7, 0, 35.38663171690695);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Королёвская Б', 4704, 1609, 1556, 53, 4, 15, 21, 34.20493197278912);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Подольская ОКБ', 7883, 2659, 2518, 141, 12, 68, 75, 33.730813142204745);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Протвинская Б', 633, 210, 196, 14, 0, 0, 0, 33.175355450236964);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Лыткаринская Б', 1143, 328, 307, 21, 4, 4, 0, 28.69641294838145);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Егорьевская Б', 2259, 584, 569, 15, 6, 3, 25, 25.852146967684813);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Сергиево-Посадская Б', 4275, 1060, 992, 68, 2, 13, 6, 24.795321637426902);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Лотошинская Б', 357, 80, 78, 2, 0, 0, 11, 22.408963585434176);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Волоколамская Б', 941, 202, 202, 0, 8, 0, 67, 21.46652497343252);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Видновская КБ', 4437, 943, 901, 42, 2, 8, 61, 21.253098940725714);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Серебряно-Прудская Б', 502, 96, 92, 4, 0, 0, 1, 19.12350597609562);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Шатурская Б', 1861, 319, 305, 14, 0, 1, 16, 17.141321869962386);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Луховицкая Б', 1451, 244, 236, 8, 1, 0, 20, 16.815988973121986);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Шаховская Б', 494, 76, 76, 0, 0, 0, 21, 15.384615384615385);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Каширская Б', 1137, 146, 134, 12, 4, 1, 7, 12.84080914687775);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Серпуховская Б', 3184, 366, 348, 18, 3, 2, 0, 11.49497487437186);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Красногорская Б', 6825, 710, 706, 4, 8, 0, 235, 10.402930402930403);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Солнечногорская Б', 3093, 296, 295, 1, 2, 0, 42, 9.569996766892984);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Клинская Б', 2802, 264, 251, 13, 2, 1, 62, 9.421841541755889);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Истринская КБ', 3193, 297, 293, 4, 2, 1, 63, 9.301597243971187);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Чеховская Б', 2648, 233, 225, 8, 1, 2, 0, 8.799093655589123);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Ступинская КБ', 2414, 170, 159, 11, 0, 1, 23, 7.042253521126761);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Раменская Б', 6571, 457, 437, 20, 7, 2, 73, 6.954801400091311);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Зарайская Б', 811, 20, 20, 0, 0, 0, 1, 2.466091245376079);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (4, 'Котельниковская П', 1151, 27, 24, 3, 1, 0, 6, 2.3457862728062553);

-- Отчёт #5 (сохранён: 2026-05-15)
INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES (5, '2026-05-15', '«Масштабирование онкоскрининговых исследований» 01.01.2026 - 15.05.2026', '1.  Аналитика показателей проекта по прохождению этапов онкоскрининга за период: с 11.05.2026 - 18.05.2026;
2. Обновление статистики для еженедельной ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным
3. Анализ эффективности работы колоноскопической службы за Апрель 2026 г. в следующих медицинских организациях:
Жуковская ОКБ, Одинцовская Б, Балашихинская Б.', '1. Подготовлена <a href="https://docs.google.com/presentation/d/10gAARMrhGxGt9vLZAKQGMeBu5QMkTYEpT4k3rq5QfMs/edit?usp=sharing" target="_blank">еженедельная статистика</a>  по проекту для ВКС с заместителем Председателя Правительства Московской области - министром здравоохранения Московской области М.В. Забелиным;
2. Проведен сравнительный анализ работы амбулаторных колоноскопов на примере 5 МО: Ногинской Б, Орехово-Зуевской Б, Пушкинской Б, Химкинской Б, Щелковской Б;
3. Проведён анализ диагнозов из направлений пациентов, прошедших колоноскопию за апрель в амбулаторных кабинетах Долгопрудненской Б, Сергиево-Посадской Б, Видновской КБ;
4. Реализован <a href="https://onko-search.emias.mosreg.ru/" target="_blank">новый дашборд </a> по онкологии для формирования отчетности по ЗНО в рамках проекта; 
5. Начаты индивидуальные разборы с отстающими медорганизациями по выявлению (менее 75% плана и более 100 недовыявленных случаев); выполнены - Мытищи, Видное, сформулированы индивидуальные дорожные карты по исправлению ситуации');
-- Недельные данные для отчёта #5
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (5, '2026-04-06', '2026-04-12', 6985);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (5, '2026-04-13', '2026-04-19', 5266);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (5, '2026-04-20', '2026-04-26', 5903);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (5, '2026-04-27', '2026-05-03', 1284);
INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES (5, '2026-05-04', '2026-05-10', 3811);
-- Данные МО для отчёта #5 (48 организаций)
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Одинцовская ОБ', 6227, 8786, 8350, 436, 18, 107, 283, 141.09523044804882);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Дубненская Б', 2068, 2915, 2780, 135, 24, 15, 56, 140.95744680851064);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Наро-Фоминская Б', 2691, 2890, 2764, 126, 2, 14, 89, 107.39502043849869);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Можайская Б', 1071, 1015, 961, 54, 4, 1, 37, 94.77124183006535);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Жуковская ОКБ', 2220, 2047, 1946, 101, 10, 41, 51, 92.2072072072072);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Домодедовская Б', 4361, 3962, 3807, 155, 5, 85, 343, 90.85072231139647);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Павлово-Посадская Б', 2365, 2061, 1960, 101, 20, 29, 71, 87.14587737843551);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Балашихинская Б', 10417, 8775, 8278, 497, 61, 129, 240, 84.237304406259);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Краснознаменская П', 658, 511, 482, 29, 0, 0, 32, 77.6595744680851);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Дмитровская Б', 3504, 2283, 2134, 149, 12, 24, 7, 65.1541095890411);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Ногинская Б', 4914, 3182, 3074, 108, 9, 18, 80, 64.75376475376476);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Рузская Б', 1061, 661, 619, 42, 2, 5, 19, 62.29971724787936);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Химкинская КБ', 5604, 3178, 3086, 92, 23, 9, 0, 56.70949321912919);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Щёлковская Б', 6617, 3583, 3377, 206, 10, 27, 189, 54.148405621883036);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Коломенская Б', 5226, 2704, 2699, 5, 10, 1, 182, 51.741293532338304);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Долгопрудненская Б', 2193, 1124, 1076, 48, 7, 5, 0, 51.25398996808026);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Воскресенская Б', 3565, 1757, 1723, 34, 11, 4, 159, 49.28471248246844);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Реутовская КБ', 1884, 889, 835, 54, 1, 15, 57, 47.18683651804671);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Мытищинская ОКБ', 6182, 2871, 2723, 148, 4, 41, 159, 46.44128113879004);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Орехово-Зуевская Б', 4465, 2068, 1937, 131, 7, 14, 73, 46.31578947368421);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Электростальская Б', 2388, 1103, 1049, 54, 3, 1, 23, 46.1892797319933);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Люберецкая ОКБ', 7753, 3063, 2843, 220, 4, 31, 137, 39.50728750161228);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'ПКБ им. проф. Розанова В.Н.', 5505, 2172, 2040, 132, 7, 21, 142, 39.45504087193461);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Королёвская Б', 4704, 1705, 1651, 54, 7, 17, 84, 36.24574829931973);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Подольская ОКБ', 7883, 2791, 2647, 144, 25, 74, 136, 35.40530254979069);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Лобненская Б', 2289, 810, 796, 14, 3, 8, 0, 35.38663171690695);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Протвинская Б', 633, 213, 198, 15, 0, 0, 2, 33.649289099526065);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Егорьевская Б', 2259, 750, 731, 19, 6, 3, 83, 33.200531208499335);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Лыткаринская Б', 1143, 337, 315, 22, 4, 4, 9, 29.483814523184606);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Сергиево-Посадская Б', 4275, 1128, 1057, 71, 2, 13, 56, 26.385964912280702);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Лотошинская Б', 357, 93, 90, 3, 0, 0, 9, 26.05042016806723);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Луховицкая Б', 1451, 375, 366, 9, 1, 0, 91, 25.844245348035837);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Шатурская Б', 1861, 477, 458, 19, 0, 4, 47, 25.63138097796883);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Волоколамская Б', 941, 232, 232, 0, 7, 0, 5, 24.654622741764083);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Видновская КБ', 4437, 1081, 1035, 46, 2, 9, 139, 24.363308541807527);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Шаховская Б', 494, 114, 114, 0, 0, 0, 23, 23.076923076923077);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Серебряно-Прудская Б', 502, 101, 97, 4, 0, 0, 4, 20.119521912350596);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Каширская Б', 1137, 201, 184, 17, 4, 1, 54, 17.678100263852244);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Красногорская Б', 6825, 956, 952, 4, 9, 0, 244, 14.007326007326007);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Истринская КБ', 3193, 405, 399, 6, 2, 1, 94, 12.68399624177889);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Клинская Б', 2802, 353, 335, 18, 2, 3, 75, 12.598144182726623);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Серпуховская Б', 3184, 380, 362, 18, 3, 2, 13, 11.934673366834172);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Солнечногорская Б', 3093, 360, 359, 1, 2, 0, 63, 11.639185257032008);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Ступинская КБ', 2414, 234, 215, 19, 0, 1, 63, 9.693454846727423);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Чеховская Б', 2648, 238, 230, 8, 1, 3, 5, 8.987915407854985);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Раменская Б', 6571, 509, 487, 22, 10, 5, 62, 7.7461573580885705);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Котельниковская П', 1151, 55, 49, 6, 1, 0, 19, 4.778453518679409);
INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES (5, 'Зарайская Б', 811, 25, 25, 0, 0, 0, 2, 3.082614056720099);

-- Обновляем автоинкремент после вставки
SELECT setval('reports_id_seq', COALESCE((SELECT MAX(id) FROM reports), 1));
