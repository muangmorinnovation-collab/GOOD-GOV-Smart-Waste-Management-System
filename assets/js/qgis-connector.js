/**
 * qgis-connector.js — Live synchronization and QGIS connector setup assistant
 * Smart Governance Municipality Platform
 */

const QGISConnector = {
    // กำหนดรายละเอียดการเชื่อมต่อดึงจาก Supabase URL
    connectionConfig: {
        host: 'db.gyerfzrbfczrdxzbkjyt.supabase.co',
        port: '5432',
        database: 'postgres',
        user: 'postgres',
        schema: 'public',
        sslMode: 'require'
    },

    getInstructionsMarkdown() {
        return `
### 🛠️ วิธีการเชื่อมต่อ Supabase PostGIS ร่วมกับ QGIS Desktop (Live Sync)

โปรแกรม **QGIS (Quantum GIS)** เป็นเครื่องมือจัดการแผนที่ที่ดีที่สุด สำหรับเจ้าหน้าที่วิศวกรรม/กองช่างขององค์กรปกครองส่วนท้องถิ่นในการใช้วาด แก้ไข และจัดการชั้นข้อมูลเชิงพื้นที่ โดยสามารถแก้ไขข้อมูลและส่งผลลัพธ์มาซิงก์บนแดชบอร์ดของระบบ WebApp ได้โดยตรงแบบ Real-time ตามขั้นตอนดังนี้:

---

#### 📌 ขั้นตอนที่ 1: ตั้งค่าการเชื่อมต่อฐานข้อมูลใน QGIS
1. เปิดโปรแกรม QGIS ขึ้นมา
2. ที่แถบเครื่องมือด้านซ้าย **Browser Panel** ให้คลิกขวาที่เมนู **PostgreSQL** หรือ **SpatiaLite** แล้วเลือก **New Connection...**
3. กรอกข้อมูลการเชื่อมต่อดังต่อไปนี้:
   - **Name:** \`Smart-Gov-Spatial-DB\`
   - **Host:** \`${this.connectionConfig.host}\`
   - **Port:** \`${this.connectionConfig.port}\`
   - **Database:** \`${this.connectionConfig.database}\`
   - **SSL Mode:** \`${this.connectionConfig.sslMode}\`
4. ส่วนของ **Authentication** ให้เลือกแบบ **Basic** และกรอกรายละเอียดดังนี้:
   - **User:** \`${this.connectionConfig.user}\`
   - **Password:** *[กรอกรหัสผ่าน Supabase Database ของเทศบาล]*
5. คลิกปุ่ม **Test Connection** หากสำเร็จ จะปรากฏข้อความยืนยันการเชื่อมต่อสำเร็จ
6. กดปุ่ม **OK** เพื่อบันทึกการตั้งค่า

---

#### 📌 ขั้นตอนที่ 2: ดึงเลเยอร์แผนที่ไปเปิดทำงานและจัดทำแผนที่
1. ดับเบิลคลิกเปิดการเชื่อมต่อใหม่ภายใต้หัวข้อ PostgreSQL จะปรากฏ Schema **public**
2. ภายใต้ Schema public คุณจะเห็นเลเยอร์ตารางเชิงพื้นที่ดังนี้:
   - 🛣️ **infra_roads** (ทะเบียนถนนและเส้นทาง)
   - 💧 **infra_water_resources** (แปลงแหล่งน้ำ)
   - 🏞️ **infra_waterways** (แนวคลองส่งน้ำ)
   - 🚧 **infra_drainage_assets** (ฝาท่อและระบายน้ำ)
   - 🌿 **infra_public_lands** (ที่ดินสาธารณประโยชน์)
   - 🎯 **infra_boundary_markers** (หมุดแนวเขต)
3. ดึงเลเยอร์เหล่านั้นลากวาง (Drag-and-Drop) เข้ามาทำแผนที่ใน QGIS
4. ท่านสามารถใช้แถบเครื่องมือ **Digitizing Tool** เพื่อวาดโครงเส้น ขีดตำแหน่ง หรือแก้ไขชื่อถนน/สภาพทางได้ทันที

---

#### 📌 ขั้นตอนที่ 3: เปิดใช้งานการอัปโหลดพิกัดอัตโนมัติ (Live Sync Trigger)
- เมื่อท่านกด **Save Edits** ในโปรแกรม QGIS ฐานข้อมูลใน Supabase จะทำงานร่วมกับ WebApp ในการรีเฟรชอัปเดตข้อมูลบนหน้าจอแผนที่ของเทศบาลทันที! โดยไม่ต้องอัปโหลดไฟล์ Shapefile ทับซ้ำแต่อย่างใด
        `;
    },

    // จำลองการเชื่อมต่อทดสอบการ Live Sync จาก QGIS
    startSimulatedLiveSync(onSyncCallback) {
        if (typeof showToast !== 'undefined') {
            showToast('🔌 ระบบเชื่อมต่อ QGIS Live Sync: สัญญาณเตรียมพร้อมเชื่อมต่อ', 'info');
        }

        // จำลองการได้รับคำขอดิจิไทซ์พิกัดใหม่ทุกๆ 45 วินาที
        const intervalId = setInterval(() => {
            const mockQGISEvent = {
                table_name: 'infra_roads',
                action_type: 'UPDATE',
                performed_by: 'QGIS Desktop (นายสมคิด การช่าง)',
                timestamp: new Date().toLocaleTimeString('th-TH'),
                data: {
                    road_id: 'ถ.ทถ. 1-0003',
                    road_name: 'ถนนนาดี-โคกเจริญ (อัปเดตผิวทางจาก QGIS)',
                    surface_type: 'แอสฟัลต์ติก/ลาดยาง', // เปลี่ยนจากหินคลุกจากโปรแกรม QGIS
                    status: 'good', // ซ่อมเสร็จแล้ว
                    latitude: 17.985,
                    longitude: 103.480
                }
            };

            // หากมี Supabase Client และต้องการเชื่อม Real-time จริง
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                // สมมติว่าดึงข้อมูลจากตาราง infra_qgis_sync_logs ล่าสุดผ่าน Real-time Subscription
                console.log("QGIS Live Sync Active Listener.");
            }

            if (onSyncCallback) {
                onSyncCallback(mockQGISEvent);
            }

        }, 35000); // 35 วินาทีต่อครั้งเพื่อให้เห็นผลงานพรีวิวระหว่างทดสอบ

        return intervalId;
    }
};

window.QGISConnector = QGISConnector;
