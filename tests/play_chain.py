"""Drive public controls only; telemetry observations never mutate game state."""
import asyncio, json, time, os
from pathlib import Path
from playwright.async_api import async_playwright

URL='http://127.0.0.1:8095/'
async def run():
    async with async_playwright() as p:
        installed=sorted((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux/chrome'))
        binary=os.environ.get('SOLMAR_CHROMIUM') or (str(installed[-1]) if installed else p.chromium.executable_path)
        browser=await p.chromium.launch(executable_path=binary,headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=await browser.new_page(viewport={'width':1280,'height':720})
        errors=[];failed=[];external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('requestfailed',lambda r:failed.append(r.url))
        page.on('response',lambda r:failed.append(f'{r.status} {r.url}') if r.status>=400 else None)
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith(URL) and not r.url.startswith('data:') else None)
        await page.goto(URL);await page.wait_for_function('window.__shotReady === true')
        await page.keyboard.press('Enter')
        async def state():return await page.evaluate('solmarState()')
        async def press(key):await page.keyboard.press(key);await page.wait_for_timeout(140)
        async def travel(x,z,tolerance=3,boost=True):
            end=time.monotonic()+55
            previous=None;stuck=0
            while time.monotonic()<end:
                s=await state()
                if s['mode']=='complete':break
                if s['mode']!='playing':raise RuntimeError(f'Interrupted: {s}')
                dx=x-s['x'];dz=z-s['z']
                if abs(dx)<tolerance and abs(dz)<tolerance:break
                # Stay axis aligned: all route bends occur on street centerlines.
                axis='x' if abs(dx)>tolerance else 'z';delta=dx if axis=='x' else dz
                key=('d' if delta>0 else 'a') if axis=='x' else ('s' if delta>0 else 'w')
                if previous==key:stuck+=1
                else:stuck=0
                previous=key
                if boost and abs(delta)>14:await page.keyboard.down('Shift')
                if abs(delta)<9:await page.keyboard.down('Space')
                await page.keyboard.down(key)
                await page.wait_for_timeout(min(450,max(65,abs(delta)/(39 if boost and s['car'] else 30 if s['car'] else 10)*800)))
                await page.keyboard.up(key)
                await page.keyboard.up('Shift')
                await page.keyboard.up('Space')
                await page.wait_for_timeout(60)
            else:raise RuntimeError(f'Route timeout to {x,z}: {await state()}')
            await page.keyboard.down('Space');await page.wait_for_timeout(220);await page.keyboard.up('Space')
        async def report(label):print(label,json.dumps(await state()),flush=True)
        await travel(-110,0,boost=False);await press('e');await travel(0,0);await report('JOB 0')
        assert (await state())['job']==1
        await travel(0,240);await press('e');await page.wait_for_timeout(250);await report('PACKAGE')
        assert (await state())['phase']==1
        await press('e');await travel(0,120);await travel(-120,120);await report('JOB 1')
        assert (await state())['job']==2
        for lap in range(4):
            for x,z in [(-120,0),(0,0),(0,-120),(120,-120),(120,120),(-120,120)]:
                await travel(x,z)
                if (await state())['job']>=3:break
            if (await state())['job']>=3:break
        await report('JOB 2')
        assert (await state())['job']==3
        s=await state()
        # Snap the navigation plan to the nearest road through physical driving.
        road=round(s['z']/60)*60
        await travel(s['x'],road);await travel(120,road);await travel(120,0)
        await press('e');await page.wait_for_timeout(13000);await report('BANK HOLD')
        assert (await state())['phase']==2
        await press('e');await travel(120,-120);await travel(-120,-120);await page.wait_for_timeout(400)
        await report('JOB 3')
        assert (await state())['job']==4
        for x,z in [(-120,0),(0,0),(0,-120)]:await travel(x,z)
        assert (await state())['job']==5
        await travel(0,240);await press('e');assert (await state())['phase']==1
        await press('e');await travel(0,120);await travel(-120,120)
        assert (await state())['job']==6
        await travel(-120,-60);await travel(-60,-60);await press('e');await press('e')
        await page.wait_for_timeout(13000);assert (await state())['phase']==2
        await travel(-60,-120);await travel(-120,-120)
        assert (await state())['job']==7 and (await state())['stars']==5
        for x,z in [(-120,0),(0,0),(0,-120),(120,-120),(120,120)]:await travel(x,z)
        assert (await state())['stars']==0
        await travel(120,-120);await travel(-120,-120)
        assert (await state())['job']==8
        for x,z in [(-120,120),(0,120),(0,240),(0,-120),(120,-120),(0,-120),(0,0),(-120,0)]:
            await travel(x,z)
        assert (await state())['job']==10
        for x,z in [(-120,-120),(-60,-120),(-60,-150),(-74,-150),(-60,-150),
                    (-60,-180),(0,-180),(0,-190),(-14,-190),(0,-190),
                    (0,0),(180,0),(180,-30),(194,-30),(180,-30),(180,-120),(-120,-120)]:
            await travel(x,z)
        assert (await state())['job']==11
        for x,z in [(-120,0),(0,0),(0,-120),(120,-120),(120,120),(120,0)]:
            await travel(x,z)
        await page.wait_for_timeout(13000)
        assert (await state())['phase']==6
        await travel(120,-120);await travel(-120,-120)
        final=await state();assert final['job']==12 and final['mode']=='complete' and final['cash']==33100 and final['earnings']==33100
        assert not errors,errors
        assert not failed,failed
        assert not external,external
        result={'jobs':[True]*12,'final':final,'console_errors':errors,'failed_requests':failed,'external_requests':external}
        with open('tests/results.json','w') as f:json.dump(result,f,indent=2)
        print('FULL CHAIN PASSED',flush=True)
        await browser.close()
asyncio.run(run())
