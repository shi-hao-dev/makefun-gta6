"""Capture unmodified browser frames from isolated deterministic scenes."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        installed=sorted((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux/chrome'))
        binary=os.environ.get('SOLMAR_CHROMIUM') or (str(installed[-1]) if installed else p.chromium.executable_path)
        browser=await p.chromium.launch(executable_path=binary,headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        # Descriptive systems metadata stays in shots.json; capture uses only name/query.
        for shot in json.load(open('shots.json')):
            context=await browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
            page=await context.new_page();issues=[]
            page.on('pageerror',lambda e:issues.append(str(e)))
            await page.goto('http://127.0.0.1:8095/'+shot['query'])
            await page.wait_for_function('window.__shotReady === true',timeout=180000)
            path='screenshots/'+shot['name']
            await page.screenshot(path=path,type='jpeg',quality=86)
            assert os.path.getsize(path)<=262144
            assert not issues,issues
            print(path,os.path.getsize(path),'1280x720',flush=True)
            await context.close()
        await browser.close()
asyncio.run(main())
