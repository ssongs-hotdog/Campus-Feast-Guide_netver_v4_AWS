
import https from 'https';

const url = 'https://hyeat-menu-dev.s3.ap-northeast-2.amazonaws.com/waiting-data/2026-02-19.json';

console.log(`Fetching ${url}...`);

https.get(url, (res) => {
    let data = '';
    console.log('Status Code:', res.statusCode);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            if (res.statusCode === 200) {
                console.log('Data fetched successfully.');
                const json = JSON.parse(data);
                console.log('First item:', JSON.stringify(json[0], null, 2));
                console.log('Total items:', json.length);

                // Test filtering
                const fixedTime = '12:30';
                const filtered = json.filter(d => JSON.stringify(d).includes(fixedTime));
                console.log(`Filtered items count for "${fixedTime}":`, filtered.length);
                if (filtered.length > 0) {
                    console.log('Sample filtered item:', JSON.stringify(filtered[0], null, 2));
                } else {
                    console.log('No items found for 12:30. checking sample timestamps:');
                    json.slice(0, 5).forEach(item => console.log(item.timestamp));
                }
            } else {
                console.log('Failed to fetch. Body prefix:', data.substring(0, 200));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data prefix:', data.substring(0, 200));
        }
    });

}).on('error', (err) => {
    console.error('Error: ', err.message);
});
