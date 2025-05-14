const fs = require('fs');
const axios = require('axios');

async function generateReport() {
    try {
        // Fetch comparison data
        const response = await axios.get('http://localhost:3000/api/concerts/statistics/compare');
        const data = response.data;

        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <title>Database Performance Optimization</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1, h2 { color: #333; }
    .stats-container { display: flex; gap: 20px; margin-bottom: 30px; }
    .stats-card { flex: 1; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .unoptimized { background-color: #fff0f0; }
    .optimized { background-color: #e6ffe6; }
    .improvement { background-color: #f0f8ff; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .highlight { font-weight: bold; color: #008800; }
    .chart { height: 300px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Concert Database Optimization Results</h1>
    <p>Testing performance with ${data.optimized.totalRecords} concert records</p>
    
    <div class="stats-container">
      <div class="stats-card unoptimized">
        <h2>Unoptimized Query</h2>
        <p><strong>Execution Time:</strong> ${data.unoptimized.executionTime}</p>
        <p><strong>Total Records:</strong> ${data.unoptimized.totalRecords}</p>
      </div>
      
      <div class="stats-card optimized">
        <h2>Optimized Query</h2>
        <p><strong>Execution Time:</strong> ${data.optimized.executionTime}</p>
        <p><strong>Total Records:</strong> ${data.optimized.totalRecords}</p>
      </div>
      
      <div class="stats-card improvement">
        <h2>Performance Improvement</h2>
        <p><strong>Time Saved:</strong> ${data.improvement.timeSaved}</p>
        <p><strong>Percentage Improvement:</strong> <span class="highlight">${data.improvement.percent}</span></p>
      </div>
    </div>
    
    <h2>Optimization Techniques</h2>
    <ul>
      <li>Used materialized views to pre-compute complex aggregations</li>
      <li>Created B-tree indexes on frequently queried columns (genre_id, date, price)</li>
      <li>Implemented GIN index with trigram operations for text search</li>
      <li>Query optimization through parallel independent subqueries</li>
      <li>Batch inserts for efficient data loading</li>
    </ul>
    
    <h2>JMeter Load Testing Results</h2>
    <p>Tests performed: 100 concurrent users, 10 requests each</p>
    <table>
      <tr>
        <th>Metric</th>
        <th>Unoptimized</th>
        <th>Optimized</th>
      </tr>
      <tr>
        <td>Average Response Time</td>
        <td>XXX ms</td>
        <td>XXX ms</td>
      </tr>
      <tr>
        <td>Throughput (req/sec)</td>
        <td>XXX</td>
        <td>XXX</td>
      </tr>
      <tr>
        <td>Error Rate</td>
        <td>XXX%</td>
        <td>XXX%</td>
      </tr>
    </table>
    
    <p><em>Note: Replace XXX values with actual JMeter test results after running them</em></p>
  </div>
</body>
</html>
    `;

        fs.writeFileSync('performance-report.html', htmlReport);
        console.log('Performance report generated: performance-report.html');

    } catch (error) {
        console.error('Error generating report:', error);
    }
}

generateReport();