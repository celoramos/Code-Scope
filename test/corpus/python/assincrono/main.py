import asyncio


async def buscar(nome, atraso):
    await asyncio.sleep(atraso)
    return f"{nome} pronto"


async def principal():
    tarefas = [buscar("a", 0), buscar("b", 0)]
    resultados = await asyncio.gather(*tarefas)
    return resultados


resultados = asyncio.run(principal())  # @pare
print(resultados)
