import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Fungsi debounce di atas komponen
function debounce(func, delay) {
  let debounceTimer;
  return function(...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func(...args), delay);
  };
}

function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cache, setCache] = useState({});

  const handleAddressChange = debounce((address) => setUserAddress(address), 300);

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length !== 0) {
        setUserAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      setUserAddress(accounts[0]);
      setIsConnected(true);
      alert('Wallet connected!');
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const config = {
    apiKey: "X1SiWxqiyYRmZDxw87uiAXo6QNkH8hVC",
    network: Network.ETH_SEPOLIA,
  };
  
  async function getTokenBalance() {
    setIsLoading(true);
    setError(false);
    try {
      const alchemy = new Alchemy(config);
  
      let addressToCheck = userAddress;
      if (ethers.utils.isAddress(userAddress) === false) {
        addressToCheck = await alchemy.core.resolveName(userAddress);
        if (!addressToCheck) {
          throw new Error('Invalid ENS or Ethereum address');
        }
      }
  
      if (cache[userAddress]) {
        setResults(cache[userAddress].results);
        setTokenDataObjects(cache[userAddress].tokenDataObjects);
        setHasQueried(true);
        setIsLoading(false);
        return;
      }
  
      const data = await alchemy.core.getTokenBalances(userAddress);
      const tokenAddresses = data.tokenBalances.map(balance => balance.contractAddress);
      const tokenDataObjects = await Promise.all(
        tokenAddresses.map(address => alchemy.core.getTokenMetadata(address))
      );
  
      setResults(data);
      setTokenDataObjects(tokenDataObjects);
      setCache(prevCache => ({
        ...prevCache,
        [userAddress]: { results: data, tokenDataObjects }
      }));
      setHasQueried(true);
    } catch (error) {
      console.error('Error details:', error);
      setError(true);
      setErrorMessage(error.message || 'Error fetching token balances');
    } finally {
      setIsLoading(false);
    }
  }
   
  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={36}>
            ERC-20 Token Indexer
          </Heading>
          <Text>
            Connect your wallet or enter an address to see all ERC-20 token balances!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={'center'}
      >
        <Button 
          fontSize={20} 
          onClick={connectWallet} 
          mt={36} 
          bgColor="green.500"
          color="white"
          _hover={{ bgColor: 'green.600' }}
        >
          {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
        </Button>
  
        <Heading mt={42}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Input
          value={userAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
        />
        <Button 
          fontSize={20} 
          onClick={getTokenBalance} 
          mt={36} 
          bgColor="blue.500"
          color="white"
          _hover={{ bgColor: 'blue.600' }}
          isLoading={isLoading}
          loadingText="Fetching tokens..."
        >
          Check ERC-20 Token Balances
        </Button>
  
        {/* Tampilkan pesan kesalahan jika ada */}
        {error && (
          <Text color="red.500" mt={4}>
            {errorMessage}
          </Text>
        )}
  
        <Heading my={36}>ERC-20 token balances:</Heading>
  
        {isLoading ? (
          <Center>
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Center>
        ) : hasQueried ? (
          <SimpleGrid w="90vw" columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
            {results.tokenBalances.map((e, i) => (
              <Flex
                flexDir="column"
                bg="white"
                border="1px"
                borderColor="gray.200"
                p={4}
                borderRadius="md"
                boxShadow="md"
                key={e.id}
                align="center"
              >
                <Box>
                  <Text fontWeight="bold" color="gray.700" textAlign="center">
                    Symbol: {tokenDataObjects[i].symbol}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.600" textAlign="center">
                    Balance: {parseFloat(Utils.formatUnits(
                      e.tokenBalance,
                      tokenDataObjects[i].decimals
                    )).toFixed(4)}
                  </Text>
                </Box>
                <Image 
                  src={tokenDataObjects[i].logo} 
                  alt={tokenDataObjects[i].symbol}
                  boxSize="60px"
                  borderRadius="full" // Membuat gambar menjadi bulat
                  mt={4}
                />
              </Flex>
            ))}
          </SimpleGrid>
        ) : (
          <Text>Please make a query! This may take a few seconds...</Text>
        )}
      </Flex>
    </Box>
  );  
}

export default App;