public class Escopo {
    static class Placar {
        int pontos;

        void somar(int pontos) {
            // O parâmetro pontos esconde o campo pontos: this.pontos é o do objeto.
            this.pontos = this.pontos + pontos;
        }
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over) e F11 (step into).
        int total = 1;
        for (int i = 0; i < 2; i++) {
            int dobro = i * 2;
            total = total + dobro;
        }
        Placar placar = new Placar();
        placar.somar(5);
        System.out.println(total + " " + placar.pontos);
    }
}
