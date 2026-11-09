#include <stdio.h>
#include <stdlib.h>

typedef struct {
    char nome[10];
    int nota;
} Aluno;

int trocas = 0;
int historico[4];

void ordena(int v[], int n)
{
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (v[j] > v[j + 1]) {
                int temp = v[j];
                v[j] = v[j + 1];
                v[j + 1] = temp;
                historico[trocas % 4] = temp;
                trocas++;
            }
        }
    }
}

int main(void) {
    int n = 4;
    // Coloque um breakpoint na linha abaixo e entre na função com F11.
    int *dados = malloc(n * sizeof(int));
    dados[0] = 7;
    dados[1] = 3;
    dados[2] = 9;
    dados[3] = 1;
    ordena(dados, n);
    Aluno a = {"ana", 9};
    a.nota = 10;
    printf("%d %d %s %d\n", dados[0], trocas, a.nome, a.nota);
    free(dados);
    return 0;
}
