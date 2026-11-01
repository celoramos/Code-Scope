public class Cubo {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        int[][][] cubo = new int[2][2][3];
        for (int k = 0; k < 2; k++) {
            for (int i = 0; i < 2; i++) {
                for (int j = 0; j < 3; j++) {
                    cubo[k][i][j] = k * 100 + i * 10 + j;
                }
            }
        }
        System.out.println(cubo[1][1][2]);
    }
}
