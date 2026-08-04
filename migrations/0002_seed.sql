INSERT INTO devices(brand,model,variant,platform) VALUES
('Vivo','Y12s','MTK','MediaTek'),('Samsung','A52','A525F',''),('Vivo','Y19s','4G',''),
('Samsung','A32','A326 5G',''),('Redmi','9','',''),('Redmi','Note 8','','');

INSERT INTO rules(name,symptom,condition_key,condition_value,fault_group,next_step,rationale,priority) VALUES
('Dead: initial current check','Mati total','initial_test','current','POWER / STARTUP','Ukur arus USB/PSU dan catat nilainya.','Current adalah evidence awal; jangan langsung menyimpulkan IC rusak.',10),
('Dead: current + heat','Mati total','current_pattern','current_with_heat','SHORT / POWER RAIL','Cari area panas dengan thermal method lalu telusuri rail terkait.','Current + panas abnormal dapat mempersempit fault group.',20),
('Dead: zero current','Mati total','current_pattern','zero_current','INPUT / CHARGING PATH','Periksa VBUS/input path, konektor, proteksi, dan jalur charging.','0A belum membuktikan fault tertentu.',20),
('Getar saja: display branch','Getar saja','initial_test','display','DISPLAY / BOOT','Periksa display power dan jalur display sesuai model/board.','Getar saja tidak otomatis berarti LCD rusak.',20),
('Restart: battery branch','Restart','initial_test','battery_swap','POWER / BATTERY','Validasi baterai dan lanjutkan pemeriksaan power/rail.','Penggantian baterai tidak selalu menyelesaikan restart.',20);

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'Mati total','USB Doctor sekitar 0.4A; PSU short kecil; area IC charging panas.','Short pada power rail menuju area IC power.','Thermal inspection, buka kaleng, angkat coil, tracing rail, verifikasi panas, ganti/angkat komponen fault.','Short hilang dan perangkat hidup.','Power on OK','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Vivo' AND model='Y12s';

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'Tidak bisa charging','VBUS board 5V; VBUS sampai OVP 5V; setelah OVP tidak masuk.','Jalur setelah OVP bermasalah.','Angkat IC OVP dan jumper sesuai hardware reference.','Logo charging muncul; 9V 1.8A; persentase naik.','Charging OK','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Samsung' AND model='A52';

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'Mati total','Mesin panas; C jalur VDD1V85 short; rosin meleleh.','C pada VDD1V85 short.','Lepas C fault lalu ukur ulang.','Short hilang dan HP hidup.','Power on OK','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Vivo' AND model='Y19s';

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'LCD blank','LCD baru tetap blank; MIPI_DSI0_CLK_N dan MIPI_DSI0_D1_P abnormal.','Jalur MIPI/display path abnormal.','Eksekusi ACP CPU lalu ukur ulang.','Hambatan connector sekitar 0.295.','LCD normal','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Samsung' AND model='A32';

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'Restart','Beberapa baterai baru tetap restart; RF_MB2_TX_RFIC short.','RF power/network path short.','Angkat IC RF VC7643.','Tidak restart dan sinyal penuh.','Boot + signal OK','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Redmi' AND model='9';

INSERT INTO repair_cases(device_id,symptom,observation,diagnosis,action,result,verification,status,trust_level)
SELECT id,'Mati total','USB PSU sekitar 0.1A; VBUS 4.9V; VPH_PWR 3.1V lalu 4.2V setelah IC charger diganti.','Charging/power rail abnormal.','Ganti IC charger PMI632 donor lalu ukur ulang.','VPH_PWR 4.2V; charging 1.3A; logo charging; boot OK.','Charging + boot OK','PUBLISHED','TECHNICIAN_VERIFIED' FROM devices WHERE brand='Redmi' AND model='Note 8';

INSERT INTO EXT_REFERENCES(title,url,source_type,credibility,notes) VALUES
('Community reference 1','https://www.facebook.com/share/g/1BgjVFK3kE/','COMMUNITY','UNVERIFIED','Reference; verifikasi sebelum menjadi rule.'),
('Community reference 2','https://www.facebook.com/share/g/14jueMNgHyV/','COMMUNITY','UNVERIFIED','Reference; verifikasi sebelum menjadi rule.'),
('Community reference 3','https://www.facebook.com/share/g/194Ho74Qy7/','COMMUNITY','UNVERIFIED','Reference; verifikasi sebelum menjadi rule.'),
('Community reference 4','https://www.facebook.com/share/g/18zfkEtvrQ/','COMMUNITY','UNVERIFIED','Reference; verifikasi sebelum menjadi rule.'),
('Community reference 5','https://www.facebook.com/share/g/18g8p7qBxj/','COMMUNITY','UNVERIFIED','Reference; verifikasi sebelum menjadi rule.');
