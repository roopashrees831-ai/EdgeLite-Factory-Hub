import urllib.request
import json
import asyncio
from robot.digital_twin import digital_twin

base_api = 'http://127.0.0.1:8000/api'

async def test_report():
    print('Testing automatic report generation on task completion...')
    await digital_twin.start()
    digital_twin.task_progress = 99.9
    await digital_twin.tick()
    await asyncio.sleep(0.1)
    await digital_twin.tick()

    req = urllib.request.Request(f'{base_api}/reports')
    with urllib.request.urlopen(req) as resp:
        reports = json.loads(resp.read().decode())
        print('Total Reports in DB:', len(reports))
        if reports:
            r = reports[0]
            print('Latest Report ID:', r['id'])
            print('Task Name:', r['task_name'])
            print('Status:', r['status'])
            print('Result:', r['final_result'])
            print(f"Metrics: Avg Load={r['avg_motor_load']}% | Peak Temp={r['peak_temperature']}°C | Duration={r['duration']}s")

            # Test PDF download
            pdf_req = urllib.request.Request(f"{base_api}/reports/{r['id']}/pdf")
            with urllib.request.urlopen(pdf_req) as pdf_resp:
                pdf_bytes = pdf_resp.read()
                print(f"PDF Download Successful! Length: {len(pdf_bytes)} bytes | MIME: {pdf_resp.headers.get('Content-Type')}")

if __name__ == '__main__':
    asyncio.run(test_report())
