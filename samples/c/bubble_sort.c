#include <stdio.h>

int main(void) {
    int numeros[5] = {5, 1, 4, 2, 8};
    int n = 5;
    // Coloque um breakpoint na linha abaixo e use F10 (step over).
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (numeros[j] > numeros[j + 1]) {
                int temp = numeros[j];
                numeros[j] = numeros[j + 1];
                numeros[j + 1] = temp;
            }
        }
    }
    printf("%d %d %d %d %d\n", numeros[0], numeros[1], numeros[2], numeros[3], numeros[4]);
    return 0;
}
