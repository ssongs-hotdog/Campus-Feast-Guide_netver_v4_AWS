import 'dotenv/config'; // Use the installed package!

const TARGET_DATE = '2026-01-26';

async function check() {
    try {
        // Dynamic import to ensure env is loaded first (though import 'dotenv/config' above handles it)
        const { getMenuFromS3 } = await import('../server/s3MenuService');

        console.log(`Checking S3 menu for date: ${TARGET_DATE}`);
        console.log(`Bucket: ${process.env.S3_BUCKET}`);
        console.log(`MENU_SOURCE: '${process.env.MENU_SOURCE}'`); // Debug print

        const result = await getMenuFromS3(TARGET_DATE);

        console.log('--- Result ---');
        console.log('Success:', result.success);
        if (!result.success) {
            console.log('Error:', result.error);
            console.log('Reason:', result.reasonCategory);
        }

        if (result.data) {
            console.log('Data found. Keys:', Object.keys(result.data));
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

check();
