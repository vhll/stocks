<template>
  <div>
    <!-- Mensagem de conectando -->
    <div
      v-show="!connected"
      class="connecting"
    >
      <b-button variant="info" disabled>
        <b-spinner small type="grow"></b-spinner>
        Conectando...
      </b-button>
    </div>

    <!-- Seleção de ativos -->
    <div
      class="selection-box"
      v-show="stocksDataList.length"
    >
      <span>Ativos:</span>
      <b-button
        v-for="stock in stocksDataList"
        :key="stock.symbol"
        :variant="stockButtonVariant(stock.symbol)"
        size="sm"
        class="stock"
        @click="toggleSelectStock(stock.symbol)"
      >
        {{stock.symbol}}
      </b-button>
      <b-button
        id="select-all-stocks"
        class="stock"
        variant="success"
        size="sm"
        @click="selectAllStocks()"
        :disabled="isSelectAllDisabled"
      >Todos</b-button>
      <b-button
        id="unselect-all-stocks"
        class="stock"
        variant="danger"
        size="sm"
        @click="unselectAllStocks()"
        :disabled="isUnselectAllDisabled"
      >Nenhum</b-button>
    </div>

    <!-- Listagem de ativos -->
    <div class="stocks-list-box">
      <b-card-group
        columns
      >
        <b-card
          bg-variant="dark"
          text-variant="white"
          :header="stock.symbol"
          class="text-center"
          v-for="(stock, index) in stocksDataList"
          :key="stock.symbol"
          v-show="isStockSelected(stock.symbol)"
        >
          <template #header>
            <div class="stock-header">
              <div class="name">{{stock.companyName}}</div>
              <div class="badge-box">
                <b-badge variant="info">{{stock.symbol}}</b-badge>
              </div>
            </div>
          </template>
          <b-card-text>
            <div
              class="price"
              :id="'tooltip-target-' + index"
            >
              <span>
                {{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stock.basePrice)}}
              </span>
              <div
                class="icon"
              >
                <b-icon
                  :icon="priceIcon(stock.symbol, stock.basePrice)"
                  :variant="priceVariant(stock.symbol, stock.basePrice)"
                ></b-icon>
              </div>
            </div>
            <b-tooltip :target="'tooltip-target-' + index" triggers="hover">
              Preço no início desta sessão: {{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalStocksPrices[stock.symbol])}}
            </b-tooltip>
          </b-card-text>
        </b-card>
      </b-card-group>
    </div>
  </div>
</template>

<style lang="scss">
.selection-box {
  margin: 20px;
}
.selection-box .stock {
  margin: 5px;
  cursor: pointer;
  box-shadow: unset !important;
}
.stocks-list-box {
  width: 80%;
  margin-left: 10%;
  margin-right: 10%;
  padding-bottom: 10px;
}
.stock-header .name {
  display: inline-block;
  overflow: hidden;
  max-height: 2em;
  width: 75%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding-right: 5px;
}
.stock-header .badge-box {
  display: inline-block;
  overflow: hidden;
  width: 20%;
}
.connecting {
  z-index: 1;
  position: absolute;
  top: 50%;
  left: 50%;
}
.connecting .disabled{
  opacity: 1 !important;
}
.price .icon{
  display: inline-block;
  padding-left: 5px;
}
</style>

<script>

export default {
  name: 'Home',
  components: {
  },
  data() {
    return {
      'stocksDataList': [], //Usado para exibição da lista de ativos.
      'originalStocksPrices': {}, //Preços no início da sessão. Ex: {'T': 50}.
      'stocksData': [], //Usado para constante atualização dos ativos.
      'supportedSymbols': [],
      'selectedStocks': [], //Ativos selecionados para monitoramento. Ex:['T','N'].
      'isFirstConnection': true,
      'connected': false,
      'listUpdateInterval': null,
      'listUpdateTime': 200 //Tempo em ms para atualização da lista de ativos.
    }
  },
  mounted() {
    console.log("mounted", this, this.$socket);
    //Para agilizar o encerramento da conexão ao recarregar o componente
    //durante o desenvolvimento.
    this.$socket.close();
    this.startListenToMessages();
    this.showListInterval();
    this.$options.sockets.onclose = () => {
      this.connected = false;
    }
  },
  beforeDestroy() {
    if (this.listUpdateInterval){
      clearInterval(this.listUpdateInterval);
      this.listUpdateInterval = null;
    }
  },
  watch: {
    selectedStocks: {
      handler(newValue, oldValue) {
        var added = [], removed = [];
        added = this._.difference(newValue, oldValue)
        removed = this._.difference(oldValue, newValue)
        if (added.length) {
          this.subscribe(added);
        }
        if (removed.length) {
          this.unsubscribe(removed);
        }
      },
      deep: false
    }
  },
  computed: {
    isSelectAllDisabled() {
      return this.selectedStocks.length == this.supportedSymbols.length;
    },
    isUnselectAllDisabled() {
      return this.selectedStocks.length == 0;
    }
  },
  methods: {
    //Baseado no symbol e no preço retorna a string do ícone adequado.
    priceIcon(symbol, price) {
      var icon = 'dash';
      if (this.originalStocksPrices[symbol] > price) {
        icon = 'chevron-down';
      } else if (this.originalStocksPrices[symbol] < price) {
        icon = 'chevron-up';
      }
      return icon;
    },
    //Baseado no symbol e no preço retorna a string da variante adequada.
    priceVariant(symbol, price) {
      var icon = 'secondary';
      if (this.originalStocksPrices[symbol] > price) {
        icon = 'danger';
      } else if (this.originalStocksPrices[symbol] < price) {
        icon = 'success';
      }
      return icon;
    },
    //Intervalo de atualização da lista de ativos para melhorar a performance.
    showListInterval() {
      this.listUpdateInterval = setInterval(
        ()=>{
          this.stocksDataList = this._.cloneDeep(this.stocksData);
        },
        this.listUpdateTime
      )
    },
    selectAllStocks() {
      this.selectedStocks = this._.cloneDeep(this.supportedSymbols);
    },
    unselectAllStocks() {
      this.selectedStocks = [];
    },
    toggleSelectStock(symbol) {
      var selectedStockscopy = this._.cloneDeep(this.selectedStocks);
      if ( this.isStockSelected(symbol) ) {
        selectedStockscopy.splice(this.selectedStocks.indexOf(symbol),1);
      } else {
        selectedStockscopy.push(symbol);
      }
      this.selectedStocks = selectedStockscopy;
    },
    isStockSelected(symbol) {
      return this.selectedStocks.includes(symbol);
    },
    stockButtonVariant(symbol) {
      return this.isStockSelected(symbol)?'info':'secondary';
    },
    //Retorna um ativo.
    getStock(symbol) {
      return this.stocksData.find(
        function(stock){ return stock.symbol == symbol }
      );
    },
    //Recebe uma message do tipo stocks-update e atualiza as stocks
    //com os novos dados.
    updateStock( parsed ) {

      //Para cada symbol atualizado.
      Object.keys(parsed.stocks).every((eventSymbol)=>{
        //Encontra a stock que foi atualizada.
        var stock = this.getStock( eventSymbol );
        if ( stock ) {
          stock.basePrice = parsed.stocks[eventSymbol];//
        }
      });
    },
    //Exibe uma message no console.
    logMessage( parsed ) {
      console.log('onMessage', parsed.event, parsed)
    },
    //Recebe uma message e através do event chama a callback adequada.
    onMessageCbs( data ) {
      var parsed = JSON.parse(data.data);
      var events = {
        "connected": () => {
          this.stocksData = parsed.stocksData;
          this.supportedSymbols = parsed.supportedSymbols;

          if ( this.isFirstConnection ) {
            //Na primeira conexão serão monitorados todos os ativos.
            this.selectedStocks = this._.cloneDeep(this.supportedSymbols);
            //Armazenando os valores iniciais dos ativos para ter indicação de
            //altas ou baixas.
            var stocks = this._.cloneDeep(this.stocksData);
            this._.each(stocks,(stock)=>{
              this.originalStocksPrices[stock.symbol] = stock.basePrice;
            })
          }

          this.logMessage(parsed);

          //Fará o subscribe somente se não for a primeira conexão.
          //Na primeira conexão o subscribe será feito pelo watch de selectedStocks.
          if (!this.isFirstConnection && this.selectedStocks.length) {
            this.subscribe(this.selectedStocks);
          }
          this.connected = true;
          this.isFirstConnection = false;
        },
        "stocks-update": () => {
          this.updateStock(parsed);
        },
        "disconnecting": () => {
          this.connected = false;
          this.logMessage(parsed);
        }
      }

      try {
        events[parsed.event](data);
      } catch (e) {
        console.warn('onMessageCbs', e);
        this.logMessage(parsed);
      }
    },
    //Define callback de onmessage.
    startListenToMessages() {
      this.$options.sockets.onmessage = (data) => {
        this.onMessageCbs(data);
      }
    },
    //Remove callback de onmessage.
    stopListenToMessages() {
      delete this.$options.sockets.onmessage
    },
    //Faz o subscribe para receber atualizações dos ativos.
    subscribe(symbols) {
      console.log('subscribe', symbols);
      var message = {
        "event": "subscribe",
        "stocks": symbols
      }
      this.$socket.sendObj(message);
    },
    //Para o subscribe que recebe atualizações dos ativos.
    unsubscribe(symbols) {
      console.log('unsubscribe', symbols);
      var message = {
        "event": "unsubscribe",
        "stocks": symbols
      }
      this.$socket.sendObj(message);
    }
  }
}
</script>
