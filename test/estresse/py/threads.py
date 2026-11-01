import threading

resultado = [0, 0, 0, 0]


def trabalha(i):
    for k in range(3):
        resultado[i] += k
        x = resultado[i]  # PARE


ts = [threading.Thread(target=trabalha, args=(i,)) for i in range(4)]
for t in ts:
    t.start()
for t in ts:
    t.join()
