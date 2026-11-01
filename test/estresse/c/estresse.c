#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct no { int v; struct no *prox; };
union u { int i; float f; };
typedef int (*op)(int);
static int dobro(int x) { return x * 2; }

int main(void) {
    int grande[100000] = {0};
    int matriz[100][100] = {{0}};
    int cubo[10][10][10] = {{{0}}};
    char texto[] = "ac\n\"<b>";
    char *ptr_nulo = NULL;
    int *lixo;
    double duplos[3] = {1.5, -0.0, 1e308};
    union u uniao; uniao.i = 1;
    op funcao = dobro;
    int *dinamico = malloc(10 * sizeof(int));
    for (int i = 0; i < 10; i++) dinamico[i] = i;
    struct no *cabeca = NULL;
    for (int i = 0; i < 3000; i++) {
        struct no *n = malloc(sizeof *n);
        n->v = i; n->prox = cabeca; cabeca = n;
    }
    struct no ciclo = {1, NULL};
    ciclo.prox = &ciclo;
    struct no vetor[3] = {{1, NULL}, {2, NULL}, {3, NULL}};
    grande[0] = 7; /* PARE */
    matriz[1][1] = 99;
    cubo[1][1][1] = 5;
    dinamico[0] = funcao(21);
    cabeca->v = -1;
    vetor[0].v = 9;
    free(dinamico);
    printf("%d %s %p %p %f\n", grande[0], texto, (void *)ptr_nulo, (void *)&lixo, duplos[0] + uniao.f);
    return 0;
}
